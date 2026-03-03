import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import ProjectSidebar from '@/components/layout/ProjectSidebar';
import Toolbar from '@/components/layout/Toolbar';
import CodeEditor from '@/components/editor/CodeEditor';
import ChatPanel from '@/components/chat/ChatPanel';
import PreviewPanel from '@/components/preview/PreviewPanel';
import SettingsModal from '@/components/modals/SettingsModal';
import DeployModal from '@/components/modals/DeployModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Code2, Eye, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useGithubFiles } from '@/hooks/useGithubFiles';
import { useStackBlitz } from '@/hooks/useStackBlitz';
import { useLocalPreview } from '@/hooks/useLocalPreview';
import type { Project } from '@/types';

const REACT_INDICATORS = [
  'src/App.tsx', 'src/App.jsx', 'src/App.js',
  'src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx',
];

const Dashboard = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [isReactProject, setIsReactProject] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const githubFiles = useGithubFiles();
  const stackBlitz = useStackBlitz();
  const localPreview = useLocalPreview();
  const sbBootedForProject = useRef<string | null>(null);
  const sbContainerEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentProject || githubFiles.fileTree.length === 0) return;

    const hasReactFiles = githubFiles.fileTree.some(f => REACT_INDICATORS.includes(f.path));
    const hasPkgJson = githubFiles.fileTree.some(f => f.path === 'package.json');
    const isReact = hasReactFiles && hasPkgJson;
    setIsReactProject(isReact);

    if (isReact && sbBootedForProject.current !== currentProject.fullName) {
      sbBootedForProject.current = currentProject.fullName;
      localPreview.startLocalPreview(currentProject).then(started => {
        if (!started && sbContainerEl.current) {
          loadAllFilesAndEmbed(currentProject, sbContainerEl.current);
        }
      });
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
      await Promise.all(
        batch.map(async (p) => {
          try {
            const headers: Record<string, string> = {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'Jeanoli-Studio-IA',
            };
            if (project.token) headers.Authorization = `Bearer ${project.token}`;
            const res = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${p}?ref=${project.branch}`,
              { headers }
            );
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                allContent[p] = atob(data.content.replace(/\n/g, ''));
              }
            }
          } catch {}
        })
      );
    }

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
      localPreview.reset();
      sbBootedForProject.current = null;
      githubFiles.loadFileTree(currentProject);
    }
  }, [currentProject?.fullName]);

  const handleUpdateContent = useCallback((index: number, content: string) => {
    githubFiles.updateFileContent(index, content);
    const file = githubFiles.openFiles[index];
    if (file && isReactProject && stackBlitz.status === 'ready') {
      stackBlitz.writeFile(file.path, content);
    }
  }, [githubFiles, isReactProject, stackBlitz]);

  const sbContainerRefCallback = useCallback((el: HTMLDivElement | null) => {
    sbContainerEl.current = el;
    if (el && currentProject && isReactProject && sbBootedForProject.current === currentProject.fullName && localPreview.status === 'unavailable' && stackBlitz.status === 'idle' && githubFiles.fileTree.length > 0) {
      loadAllFilesAndEmbed(currentProject, el);
    }
  }, [currentProject, isReactProject, githubFiles.fileTree, loadAllFilesAndEmbed, localPreview.status, stackBlitz.status]);

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
      localPreview.reset();
      sbBootedForProject.current = null;
      githubFiles.loadFileTree(currentProject);
    }
  };

  const handleFileWritten = useCallback((filePath: string) => {
    // Refresh file tree when AI writes a file
    if (currentProject) {
      githubFiles.loadFileTree(currentProject);
    }
  }, [currentProject, githubFiles]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        currentProject={currentProject}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <ProjectSidebar
            isGithubConnected={true}
            currentProject={currentProject}
            onSelectProject={handleSelectProject}
            onConnectGithub={() => {}}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="h-8 w-8 mx-1 text-muted-foreground hover:text-foreground shrink-0"
              title={sidebarVisible ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
            >
              {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>
            {currentProject && (
              <div className="flex-1">
                <Toolbar
                  project={currentProject}
                  modifiedFiles={githubFiles.openFiles}
                  onCommitDone={handleCommitDone}
                  onSync={handleSync}
                  onDeploy={() => setShowDeploy(true)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-[380px] flex flex-col border-r border-border shrink-0">
              <ChatPanel
                project={currentProject}
                fileTree={githubFiles.fileTree}
                onFileWritten={handleFileWritten}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 pt-2 bg-card border-b border-border">
                  <TabsList className="h-9 bg-muted/50 rounded-xl p-0.5">
                    <TabsTrigger value="preview" className="rounded-lg text-xs font-medium gap-1.5 px-4 data-[state=active]:shadow-md">
                      <Eye className="w-3.5 h-3.5" /> Live Preview
                      {isReactProject && stackBlitz.status === 'ready' && (
                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="editor" className="rounded-lg text-xs font-medium gap-1.5 px-4 data-[state=active]:shadow-md">
                      <Code2 className="w-3.5 h-3.5" /> Editor de Código
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
                  <PreviewPanel
                    project={currentProject}
                    previewHtml={githubFiles.previewHtml}
                    isLoading={githubFiles.isLoadingTree}
                    isReactProject={isReactProject}
                    sbStatus={stackBlitz.status}
                    sbContainerRef={sbContainerRefCallback}
                    localPreviewUrl={localPreview.previewUrl}
                    localPreviewStatus={localPreview.status}
                  />
                </TabsContent>
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
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <DeployModal open={showDeploy} onClose={() => setShowDeploy(false)} project={currentProject} />
    </div>
  );
};

export default Dashboard;
