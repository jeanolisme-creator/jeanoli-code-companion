import { Zap, Settings, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';

interface HeaderProps {
  currentProject: Project | null;
  onOpenSettings: () => void;
}

const Header = ({ currentProject, onOpenSettings }: HeaderProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="bg-header text-header-foreground px-6 py-3 flex items-center justify-between border-b-2 border-primary/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Jeanoli Studio IA</h1>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/20 text-primary-foreground/80 ml-2">
          beta
        </span>
      </div>

      <div className="flex items-center gap-3">
        {currentProject && (
          <span className="text-sm text-header-foreground/60 hidden md:block">
            📂 {currentProject.name}
          </span>
        )}

        {profile?.isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/users')}
            className="text-header-foreground/70 hover:text-header-foreground hover:bg-white/10 rounded-full"
          >
            <Users className="w-5 h-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="text-header-foreground/70 hover:text-header-foreground hover:bg-white/10 rounded-full transition-transform hover:rotate-45"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium hidden md:block">{profile?.name}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="text-header-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-full"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
