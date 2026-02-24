import { useState } from 'react';
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
import { Code2, Eye, MessageSquare } from 'lucide-react';
import type { Project } from '@/types';

const Dashboard = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [showOAuth, setShowOAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

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
          onSelectProject={setCurrentProject}
          onConnectGithub={() => setShowOAuth(true)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentProject && <Toolbar project={currentProject} />}

          <div className="flex flex-1 overflow-hidden">
            {/* Left: Chat */}
            <div className="w-[380px] flex flex-col border-r border-border shrink-0">
              <ChatPanel />
            </div>

            {/* Right: Editor/Preview Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 pt-2 bg-card border-b border-border">
                  <TabsList className="h-9 bg-muted/50 rounded-xl p-0.5">
                    <TabsTrigger value="editor" className="rounded-lg text-xs font-medium gap-1.5 px-4 data-[state=active]:shadow-md">
                      <Code2 className="w-3.5 h-3.5" /> Editor de Código
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg text-xs font-medium gap-1.5 px-4 data-[state=active]:shadow-md">
                      <Eye className="w-3.5 h-3.5" /> Live Preview
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="editor" className="flex-1 overflow-hidden m-0">
                  <CodeEditor />
                </TabsContent>
                <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
                  <PreviewPanel />
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
