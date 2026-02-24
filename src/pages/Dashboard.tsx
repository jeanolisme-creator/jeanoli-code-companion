import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import ProjectSidebar from '@/components/layout/ProjectSidebar';
import Toolbar from '@/components/layout/Toolbar';
import CodeEditor from '@/components/editor/CodeEditor';
import ChatPanel from '@/components/chat/ChatPanel';
import PreviewPanel from '@/components/preview/PreviewPanel';
import OAuthModal from '@/components/modals/OAuthModal';
import SettingsModal from '@/components/modals/SettingsModal';
import UsersModal from '@/components/modals/UsersModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Code2, Eye } from 'lucide-react';
import { useGithubFiles } from '@/hooks/useGithubFiles';
import { useWebContainer } from '@/hooks/useWebContainer';
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
  const [showUsers, setShowUsers] = useState(false);
  const [isReactProject, setIsReactProject] = useState(false);

  const githubFiles = useGithubFiles();
  const webContainer = useWebContainer();
  const wcBootedForProject = useRef<string | null>(null);

  // Detect if this is a React project and boot WebContainer
  useEffect(() => {
    if (!currentProject || githubFiles.fileTree.length === 0) return;

    const hasReactFiles = githubFiles.fileTree.some(f => REACT_INDICATORS.includes(f.path));
    const hasPkgJson = githubFiles.fileTree.some(f => f.path === 'package.json');
    const isReact = hasReactFiles && hasPkgJson;
    setIsReactProject(isReact);

    // Start WebContainer for React projects
    if (isReact && wcBootedForProject.current !== currentProject.fullName) {
      wcBootedForProject.current = currentProject.fullName;
      // We need to load all project files first, then boot
      loadAllFilesAndBoot(currentProject);
    }
  }, [currentProject?.fullName, githubFiles.fileTree]);

  const loadAllFilesAndBoot = useCallback(async (project: Project) => {
    // Get all text files (skip large/binary files)
    const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md', '.svg', '.mjs', '.cjs', '.yml', '.yaml', '.toml', '.env', '.txt', '.lock'];
    const filesToLoad = githubFiles.fileTree
      .filter(f => {
        const ext = '.' + f.path.split('.').pop()?.toLowerCase();
        return textExtensions.includes(ext) && f.size < 200000 && !f.path.includes('node_modules') && !f.path.startsWith('.git/');
      })
      .map(f => f.path);

    if (filesToLoad.length === 0) return;

    // Load files in batches
    const { owner, repo } = { owner: project.fullName.split('/')[0], repo: project.fullName.split('/')[1] };
    const allContent: Record<string, string> = {};
    const batchSize = 20;

    for (let i = 0; i < filesToLoad.length; i += batchSize) {
      const batch = filesToLoad.slice(i, i + batchSize);
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('github-repo-files', {
          body: { owner, repo, branch: project.branch, token: project.token, action: 'batch', path: batch },
        });
        if (data?.ok && data.files) {
          Object.assign(allContent, data.files);
        }
      } catch {}
    }

    // Exclude lock files from WebContainer mount (too large, not needed for dev preview)
    const filtered: Record<string, string> = {};
    for (const [path, content] of Object.entries(allContent)) {
      if (!path.endsWith('.lock') && !path.endsWith('lock.json') && !path.includes('node_modules')) {
        filtered[path] = content;
      }
    }

    if (Object.keys(filtered).length > 0) {
      webContainer.startProject(filtered);
    }
  }, [githubFiles.fileTree, webContainer]);

  useEffect(() => {
    if (currentProject) {
      githubFiles.resetFiles();
      webContainer.teardown();
      wcBootedForProject.current = null;
      githubFiles.loadFileTree(currentProject);
    }
  }, [currentProject?.fullName]);

  // Sync file edits to WebContainer
  const handleUpdateContent = useCallback((index: number, content: string) => {
    githubFiles.updateFileContent(index, content);

    // Write to WebContainer if running
    const file = githubFiles.openFiles[index];
    if (file && isReactProject && webContainer.status === 'ready') {
      webContainer.writeFile(file.path, content);
    }
  }, [githubFiles, isReactProject, webContainer]);

  const handleSelectProject = (p: Project) => {
    setCurrentProject(p);
  };

  const handleCommitDone = () => {
    if (currentProject) {
      githubFiles.resetFiles();
      githubFiles.loadFileTree(currentProject);
    }
  };

  const handleSync = () => {
    if (currentProject) {
      githubFiles.resetFiles();
      webContainer.teardown();
      wcBootedForProject.current = null;
      githubFiles.loadFileTree(currentProject);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        currentProject={currentProject}
        onOpenSettings={() => setShowSettings(true)}
        onOpenUsers={() => setShowUsers(true)}
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
                      {isReactProject && webContainer.status === 'ready' && (
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
                    wcStatus={webContainer.status}
                    wcPreviewUrl={webContainer.previewUrl}
                    wcLogs={webContainer.logs}
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
      <UsersModal open={showUsers} onClose={() => setShowUsers(false)} />
    </div>
  );
};

export default Dashboard;
