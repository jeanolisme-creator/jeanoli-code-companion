import { useState, useEffect, useRef, useCallback } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Project } from '@/types';

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type SBStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PreviewPanelProps {
  project?: Project | null;
  previewHtml?: string;
  isLoading?: boolean;
  isReactProject?: boolean;
  sbStatus?: SBStatus;
  sbContainerRef?: React.RefCallback<HTMLDivElement>;
}

const viewModes: { key: ViewMode; icon: typeof Monitor; label: string; width: string }[] = [
  { key: 'desktop', icon: Monitor, label: 'Desktop', width: 'w-full' },
  { key: 'tablet', icon: Tablet, label: 'Tablet', width: 'max-w-[768px]' },
  { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 'max-w-[375px]' },
];

const PreviewPanel = ({
  project,
  previewHtml,
  isLoading: externalLoading,
  isReactProject = false,
  sbStatus = 'idle',
  sbContainerRef,
}: PreviewPanelProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isProcessing = sbStatus === 'loading';
  const showStackBlitz = isReactProject && sbStatus === 'ready';
  const shouldUseStaticPreview = !showStackBlitz;

  // Write HTML to iframe (for static sites, or as fallback for React projects)
  useEffect(() => {
    if (shouldUseStaticPreview && iframeRef.current && previewHtml) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
      } catch {
        iframeRef.current.srcdoc = previewHtml;
      }
    }
  }, [previewHtml, shouldUseStaticPreview]);

  const handleRefresh = () => {
    if (shouldUseStaticPreview && iframeRef.current && previewHtml) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
      } catch {}
    }
    toast.info('🔄 Preview atualizado');
  };

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
          {isReactProject && sbStatus !== 'idle' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              sbStatus === 'ready' ? 'bg-success/15 text-success' :
              sbStatus === 'error' ? 'bg-destructive/15 text-destructive' :
              'bg-primary/15 text-primary'
            }`}>
              ⚡ {sbStatus === 'ready' ? 'StackBlitz ativo' : sbStatus === 'loading' ? 'Carregando StackBlitz...' : 'Erro'}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={!project}>
            <RefreshCw className={`w-3.5 h-3.5 ${externalLoading || isProcessing ? 'animate-spin' : ''}`} />
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
          {viewModes.map(({ key, icon: Icon }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="icon"
              className={`h-7 w-7 ${viewMode === key ? 'gradient-primary' : ''}`}
              onClick={() => setViewMode(key)}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-auto flex items-start justify-center bg-muted/20">
        {project && showStackBlitz ? (
          <div className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 h-full w-full relative ${
            viewModes.find(v => v.key === viewMode)?.width
          }`}>
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Carregando StackBlitz...</span>
                </div>
              </div>
            )}
            <div ref={sbContainerRef} className="w-full h-full" />
          </div>
        ) : project && previewHtml ? (
          <div className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 h-full w-full relative ${
            viewModes.find(v => v.key === viewMode)?.width
          }`}>
            {externalLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title={`Preview de ${project.name}`}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        ) : project && (externalLoading || isProcessing) ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando preview do repositório...</p>
          </div>
        ) : project ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Preview indisponível no momento</h3>
              <p className="text-sm text-muted-foreground">
                Não foi possível gerar o preview deste projeto agora. Tente sincronizar e abrir novamente.
              </p>
            </div>
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
