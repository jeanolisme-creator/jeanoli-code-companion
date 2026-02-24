import { useState } from 'react';
import { RefreshCw, GitCommit, Rocket, GitBranch, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Project, OpenFile } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ToolbarProps {
  project: Project;
  modifiedFiles?: OpenFile[];
  onCommitDone?: () => void;
  onSync?: () => void;
}

const Toolbar = ({ project, modifiedFiles = [], onCommitDone, onSync }: ToolbarProps) => {
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  const modified = modifiedFiles.filter(f => f.modified);

  const syncProject = () => {
    toast.info('🔄 Sincronizando com GitHub...');
    onSync?.();
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) { toast.error('Informe a mensagem de commit'); return; }
    if (modified.length === 0) { toast.error('Nenhum arquivo modificado'); return; }
    if (!project.token) { toast.error('Token GitHub necessário para commit. Reimporte o projeto com token.'); return; }

    const [owner, repo] = project.fullName.split('/');
    setIsCommitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('github-commit', {
        body: {
          owner, repo,
          branch: project.branch,
          token: project.token,
          message: commitMessage,
          files: modified.map(f => ({ path: f.path, content: f.content })),
        },
      });

      if (error || !data?.ok) {
        toast.error(data?.error || 'Erro ao fazer commit');
        return;
      }

      toast.success(`✅ Commit realizado! ${data.commitSha?.substring(0, 7)}`);
      setCommitMessage('');
      setShowCommitModal(false);
      onCommitDone?.();
    } catch {
      toast.error('Erro de conexão ao fazer commit');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <>
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
            {modified.length > 0 && (
              <span className="flex items-center gap-1 bg-warning/15 text-warning px-2 py-0.5 rounded-full font-medium">
                {modified.length} arquivo(s) modificado(s)
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncProject} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCommitModal(true)}
            disabled={modified.length === 0}
            className="gap-1.5 text-xs bg-success hover:bg-success/90 text-success-foreground"
          >
            <GitCommit className="w-3.5 h-3.5" /> Commit ({modified.length})
          </Button>
        </div>
      </div>

      <Dialog open={showCommitModal} onOpenChange={setShowCommitModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-success" /> Commit & Push
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensagem do commit</label>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="feat: atualização do projeto"
                className="text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Arquivos modificados:</p>
              {modified.map(f => (
                <p key={f.path} className="pl-2">• {f.path}</p>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCommitModal(false)}>Cancelar</Button>
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleCommit} disabled={isCommitting}>
                {isCommitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Enviando...</> : 'Commit & Push'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Toolbar;
