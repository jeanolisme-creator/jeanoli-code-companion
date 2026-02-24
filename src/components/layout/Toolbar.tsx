import { RefreshCw, GitCommit, Rocket, GitBranch, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';
import { toast } from 'sonner';

interface ToolbarProps {
  project: Project;
}

const Toolbar = ({ project }: ToolbarProps) => {
  const syncProject = () => {
    toast.info('🔄 Sincronizando com GitHub...');
    setTimeout(() => toast.success('✅ Projeto sincronizado!'), 2000);
  };

  const commitChanges = () => {
    toast.info('📥 Commit em andamento...');
    setTimeout(() => toast.success('✅ Commit realizado com sucesso!'), 2000);
  };

  const deployPreview = () => {
    toast.info('🚀 Fazendo deploy do preview...');
    setTimeout(() => toast.success('✅ Preview disponível em: preview.jeanoli.dev'), 3000);
  };

  return (
    <div className="px-5 py-3 bg-card border-b border-border flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold">{project.name}</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>🔗 {project.fullName}</span>
          <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
            <GitBranch className="w-3 h-3" /> {project.branch}
          </span>
          {project.isPrivate && (
            <span className="flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> privado
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={syncProject} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
        </Button>
        <Button size="sm" onClick={commitChanges} className="gap-1.5 text-xs bg-success hover:bg-success/90 text-success-foreground">
          <GitCommit className="w-3.5 h-3.5" /> Commit
        </Button>
        <Button size="sm" onClick={deployPreview} className="gap-1.5 text-xs gradient-primary border-0">
          <Rocket className="w-3.5 h-3.5" /> Deploy
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
