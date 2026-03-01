import { useState } from 'react';
import { Rocket, Server, Globe, Copy, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Project } from '@/types';

interface DeployModalProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
}

const PORTS = Array.from({ length: 500 }, (_, i) => 4001 + i);

const DeployModal = ({ open, onClose, project }: DeployModalProps) => {
  const [port, setPort] = useState('4001');
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [deployUrl, setDeployUrl] = useState('');

  const handleDeploy = async () => {
    if (!project) return;
    setStatus('starting');

    try {
      // Call local dev server API (only works when running locally)
      const res = await fetch(`http://localhost:${port}/__dev_status`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);

      if (res?.ok) {
        // Server already running on this port
        setDeployUrl(`http://localhost:${port}`);
        setStatus('running');
        toast.success(`🚀 Projeto já rodando na porta ${port}!`);
        return;
      }

      // Try to start via local API
      const startRes = await fetch('http://localhost:7799/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: project.fullName,
          port: parseInt(port),
          branch: project.branch,
        }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);

      if (startRes?.ok) {
        const data = await startRes.json();
        setDeployUrl(data.url || `http://localhost:${port}`);
        setStatus('running');
        toast.success(`🚀 Deploy iniciado na porta ${port}!`);
      } else {
        setStatus('error');
        toast.error(
          'Servidor local não encontrado. Execute o script local-deploy-server.js na sua máquina para habilitar o deploy local.',
          { duration: 8000 }
        );
      }
    } catch {
      setStatus('error');
      toast.error('Não foi possível conectar ao servidor local de deploy.');
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(deployUrl);
    toast.success('URL copiada!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> Deploy Local
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {project ? (
            <>
              <div className="bg-muted rounded-xl p-3 border border-border">
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.fullName} • {project.branch}</p>
              </div>

              <div>
                <Label className="text-xs font-medium mb-1.5 block">Porta do servidor</Label>
                <Select value={port} onValueChange={setPort}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PORTS.slice(0, 100).map(p => (
                      <SelectItem key={p} value={String(p)}>
                        <span className="flex items-center gap-2">
                          <Server className="w-3 h-3" /> Porta {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ou digite manualmente (4001 a 4500):
                </p>
                <Input
                  type="number"
                  min={4001}
                  max={4500}
                  value={port}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (v >= 4001 && v <= 4500) setPort(String(v));
                  }}
                  className="mt-1 h-9 text-sm"
                />
              </div>

              {status === 'running' && deployUrl && (
                <div className="bg-success/10 border border-success/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-success text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Projeto rodando!
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={deployUrl} readOnly className="text-xs h-8 bg-background" />
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={copyUrl}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => window.open(deployUrl, '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs text-destructive">
                  <p className="font-medium mb-1">⚠️ Servidor local não encontrado</p>
                  <p>Para usar o deploy local, execute na sua máquina:</p>
                  <code className="block mt-1 bg-background p-2 rounded-lg font-mono text-[11px]">
                    node local-deploy-server.js
                  </code>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Fechar</Button>
                <Button
                  onClick={handleDeploy}
                  disabled={status === 'starting'}
                  className="gradient-primary text-primary-foreground gap-2"
                >
                  {status === 'starting' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
                  ) : status === 'running' ? (
                    <><Globe className="w-4 h-4" /> Reiniciar</>
                  ) : (
                    <><Rocket className="w-4 h-4" /> Iniciar Deploy</>
                  )}
                </Button>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 O deploy local requer que o projeto esteja clonado e o script <code className="font-mono bg-muted px-1 rounded">local-deploy-server.js</code> esteja rodando. 
                  O servidor Vite será iniciado na porta selecionada com hot-reload completo.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Selecione um projeto primeiro
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeployModal;
