import { useState } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Project } from '@/types';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface PreviewPanelProps {
  project?: Project | null;
  previewHtml?: string;
  isLoading?: boolean;
}

const viewModes: { key: ViewMode; icon: typeof Monitor; label: string; width: string }[] = [
  { key: 'desktop', icon: Monitor, label: 'Desktop', width: 'w-full' },
  { key: 'tablet', icon: Tablet, label: 'Tablet', width: 'max-w-[768px]' },
  { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 'max-w-[375px]' },
];

const PreviewPanel = ({ project, previewHtml, isLoading: externalLoading }: PreviewPanelProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(false);

  const handleRefresh = () => {
    setIframeLoading(true);
    setIframeKey(k => k + 1);
    toast.info('🔄 Preview atualizado');
  };

  const loading = externalLoading || iframeLoading;

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">👁️ Live Preview</span>
          {project ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
              ● {project.name}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              Nenhum projeto
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={!project}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {project && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => window.open(`https://github.com/${project.fullName}`, '_blank')}
              title="Abrir no GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          {viewModes.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="icon"
              className={`h-7 w-7 ${viewMode === key ? 'gradient-primary' : ''}`}
              onClick={() => { setViewMode(key); toast.info(`📐 ${label}`); }}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-auto flex items-start justify-center bg-muted/20">
        {project && previewHtml ? (
          <div className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 h-full w-full relative ${
            viewModes.find(v => v.key === viewMode)?.width
          }`}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <iframe
              key={iframeKey}
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title={`Preview de ${project.name}`}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        ) : externalLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando preview do repositório...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Nenhum projeto selecionado</h3>
              <p className="text-sm text-muted-foreground">
                Selecione ou importe um projeto do GitHub para visualizar o preview aqui.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
