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
            {/* Left: Editor + Chat */}
            <div className="w-1/2 flex flex-col border-r border-border">
              <div className="h-[60%] border-b border-border">
                <CodeEditor />
              </div>
              <div className="h-[40%]">
                <ChatPanel />
              </div>
            </div>

            {/* Right: Preview */}
            <div className="w-1/2">
              <PreviewPanel />
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
