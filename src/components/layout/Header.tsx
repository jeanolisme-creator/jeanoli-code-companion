import { Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';

interface HeaderProps {
  currentProject: Project | null;
  onOpenSettings: () => void;
}

const Header = ({ currentProject, onOpenSettings }: HeaderProps) => {
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
          local
        </span>
      </div>

      <div className="flex items-center gap-3">
        {currentProject && (
          <span className="text-sm text-header-foreground/60 hidden md:block">
            📂 {currentProject.name}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="text-header-foreground/70 hover:text-header-foreground hover:bg-white/10 rounded-full transition-transform hover:rotate-45"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
