import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import ProjectSidebar from '@/components/layout/ProjectSidebar';
import Toolbar from '@/components/layout/Toolbar';
import CodeEditor from '@/components/editor/CodeEditor';
import ChatPanel from '@/components/chat/ChatPanel';
import PreviewPanel from '@/components/preview/PreviewPanel';
import OAuthModal from '@/components/modals/OAuthModal';
import SettingsModal from '@/components/modals/SettingsModal';
import DeployModal from '@/components/modals/DeployModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Code2, Eye } from 'lucide-react';
import { useGithubFiles } from '@/hooks/useGithubFiles';
import { useStackBlitz } from '@/hooks/useStackBlitz';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types';

const REACT_INDICATORS = [
  'src/App.tsx', 'src/App.jsx', 'src/App.js',
  'src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx',
];

const Dashboard = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [showOAuth, setShowOAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [isReactProject, setIsReactProject] = useState(false);

  const githubFiles = useGithubFiles();
  const stackBlitz = useStackBlitz();
  const sbBootedForProject = useRef<string | null>(null);
  const sbContainerEl = useRef<HTMLDivElement | null>(null);

  // Detect React project and embed StackBlitz
  useEffect(() => {
    if (!currentProject || githubFiles.fileTree.length === 0) return;

    const hasReactFiles = githubFiles.fileTree.some(f => REACT_INDICATORS.includes(f.path));
    const hasPkgJson = githubFiles.fileTree.some(f => f.path === 'package.json');
    const isReact = hasReactFiles && hasPkgJson;
    setIsReactProject(isReact);

    if (isReact && sbBootedForProject.current !== currentProject.fullName && sbContainerEl.current) {
      sbBootedForProject.current = currentProject.fullName;
      loadAllFilesAndEmbed(currentProject, sbContainerEl.current);
    }
  }, [currentProject?.fullName, githubFiles.fileTree]);

  const loadAllFilesAndEmbed = useCallback(async (project: Project, container: HTMLDivElement) => {
    const textExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md', '.svg', '.mjs', '.cjs', '.yml', '.yaml', '.toml', '.env', '.txt'];
    const filesToLoad = githubFiles.fileTree
      .filter(f => {
        const ext = '.' + (f.path.split('.').pop()?.toLowerCase() || '');
        return textExts.includes(ext) && f.size < 200000 && !f.path.includes('node_modules') && !f.path.startsWith('.git/');
      })
      .map(f => f.path);

    if (filesToLoad.length === 0) return;

    const [owner, repo] = project.fullName.split('/');
    const allContent: Record<string, string> = {};
    const batchSize = 20;

    for (let i = 0; i < filesToLoad.length; i += batchSize) {
      const batch = filesToLoad.slice(i, i + batchSize);
      try {
        const { data } = await supabase.functions.invoke('github-repo-files', {
          body: { owner, repo, branch: project.branch, token: project.token, action: 'batch', path: batch },
        });
        if (data?.ok && data.files) Object.assign(allContent, data.files);
      } catch {}
    }

    // Filter out lock files
    const filtered: Record<string, string> = {};
    for (const [path, content] of Object.entries(allContent)) {
      if (!path.endsWith('.lock') && !path.endsWith('lock.json')) {
        filtered[path] = content;
      }
    }

    if (Object.keys(filtered).length > 0) {
      await stackBlitz.embedProject(container, filtered, project.name);
    }
  }, [githubFiles.fileTree, stackBlitz]);

  useEffect(() => {
    if (currentProject) {
      githubFiles.resetFiles();
      stackBlitz.teardown();
      sbBootedForProject.current = null;
      githubFiles.loadFileTree(currentProject);
    }
  }, [currentProject?.fullName]);

  // Sync edits to StackBlitz
  const handleUpdateContent = useCallback((index: number, content: string) => {
    githubFiles.updateFileContent(index, content);
    const file = githubFiles.openFiles[index];
    if (file && isReactProject && stackBlitz.status === 'ready') {
      stackBlitz.writeFile(file.path, content);
    }
  }, [githubFiles, isReactProject, stackBlitz]);

  // Ref callback for StackBlitz container - triggers embed when element mounts
  const sbContainerRefCallback = useCallback((el: HTMLDivElement | null) => {
    sbContainerEl.current = el;
    if (el && currentProject && isReactProject && sbBootedForProject.current !== currentProject.fullName && githubFiles.fileTree.length > 0) {
      sbBootedForProject.current = currentProject.fullName;
      loadAllFilesAndEmbed(currentProject, el);
    }
  }, [currentProject, isReactProject, githubFiles.fileTree, loadAllFilesAndEmbed]);

  const handleSelectProject = (p: Project) => setCurrentProject(p);

  const handleCommitDone = () => {
    if (currentProject) {
      githubFiles.resetFiles();
      githubFiles.loadFileTree(currentProject);
    }
  };

  const handleSync = () => {
    if (currentProject) {
      githubFiles.resetFiles();
      stackBlitz.teardown();
      sbBootedForProject.current = null;
      githubFiles.loadFileTree(currentProject);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        currentProject={currentProject}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar
          isGithubConnected={isGithubConnected}
          currentProject={currentProject}
          onSelectProject={handleSelectProject}
          onConnectGithub={() => setShowOAuth(true)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentProject && (
            <Toolbar
              project={currentProject}
              modifiedFiles={githubFiles.openFiles}
              onCommitDone={handleCommitDone}
              onSync={handleSync}
              onDeploy={() => setShowDeploy(true)}
            />
          )}

          <div className="flex flex-1 overflow-hidden">
            <div className="w-[380px] flex flex-col border-r border-border shrink-0">
              <ChatPanel />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 pt-2 bg-card border-b border-border">
                  <TabsList className="h-9 bg-muted/50 rounded-xl p-0.5">
                    <TabsTrigger value="editor" className="rounded-lg text-xs font-medium gap-1.5 px-4 data-[state=active]:shadow-md">
                      <Code2 className="w-3.5 h-3.5" /> Editor de Código
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg text-xs font-medium gap-1.5 px-4 data-[state=active]:shadow-md">
                      <Eye className="w-3.5 h-3.5" /> Live Preview
                      {isReactProject && stackBlitz.status === 'ready' && (
                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="editor" className="flex-1 overflow-hidden m-0">
                  <CodeEditor
                    openFiles={githubFiles.openFiles}
                    activeFileIndex={githubFiles.activeFileIndex}
                    onSetActiveFile={githubFiles.setActiveFileIndex}
                    onCloseFile={githubFiles.closeFile}
                    onUpdateContent={handleUpdateContent}
                    isLoading={githubFiles.isLoadingFile}
                    fileTree={githubFiles.fileTree}
                    project={currentProject}
                    onOpenFile={(path) => currentProject && githubFiles.loadSingleFile(currentProject, path)}
                  />
                </TabsContent>
                <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
                  <PreviewPanel
                    project={currentProject}
                    previewHtml={githubFiles.previewHtml}
                    isLoading={githubFiles.isLoadingTree}
                    isReactProject={isReactProject}
                    sbStatus={stackBlitz.status}
                    sbContainerRef={sbContainerRefCallback}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <OAuthModal
        open={showOAuth}
        onClose={() => setShowOAuth(false)}
        onAuthorize={() => { setIsGithubConnected(true); setShowOAuth(false); }}
      />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <DeployModal open={showDeploy} onClose={() => setShowDeploy(false)} project={currentProject} />
    </div>
  );
};

export default Dashboard;
