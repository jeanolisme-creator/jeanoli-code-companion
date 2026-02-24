import { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Globe, Loader2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Project } from '@/types';

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type WCStatus = 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error';

interface PreviewPanelProps {
  project?: Project | null;
  previewHtml?: string;
  isLoading?: boolean;
  // WebContainer props
  wcStatus?: WCStatus;
  wcPreviewUrl?: string;
  wcLogs?: string[];
  isReactProject?: boolean;
}

const viewModes: { key: ViewMode; icon: typeof Monitor; label: string; width: string }[] = [
  { key: 'desktop', icon: Monitor, label: 'Desktop', width: 'w-full' },
  { key: 'tablet', icon: Tablet, label: 'Tablet', width: 'max-w-[768px]' },
  { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 'max-w-[375px]' },
];

const statusLabels: Record<WCStatus, string> = {
  idle: 'Aguardando',
  booting: 'Iniciando runtime...',
  installing: 'Instalando dependências...',
  starting: 'Iniciando servidor...',
  ready: 'Servidor rodando',
  error: 'Erro',
};

const PreviewPanel = ({
  project,
  previewHtml,
  isLoading: externalLoading,
  wcStatus = 'idle',
  wcPreviewUrl,
  wcLogs = [],
  isReactProject = false,
}: PreviewPanelProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showLogs, setShowLogs] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // For static HTML preview: write directly to iframe
  useEffect(() => {
    if (!isReactProject && iframeRef.current && previewHtml) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(previewHtml);
          doc.close();
        }
      } catch {
        iframeRef.current.srcdoc = previewHtml;
      }
    }
  }, [previewHtml, isReactProject]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [wcLogs]);

  const handleRefresh = () => {
    if (isReactProject && wcPreviewUrl && iframeRef.current) {
      iframeRef.current.src = wcPreviewUrl;
    } else if (!isReactProject && iframeRef.current && previewHtml) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
      } catch {}
    }
    toast.info('🔄 Preview atualizado');
  };

  const useWebContainerView = isReactProject && (wcStatus !== 'idle');
  const showIframe = useWebContainerView ? wcStatus === 'ready' && wcPreviewUrl : !!previewHtml;
  const isProcessing = wcStatus === 'booting' || wcStatus === 'installing' || wcStatus === 'starting';

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Top bar */}
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
          {useWebContainerView && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              wcStatus === 'ready' ? 'bg-success/15 text-success' :
              wcStatus === 'error' ? 'bg-destructive/15 text-destructive' :
              'bg-primary/15 text-primary'
            }`}>
              ⚡ {statusLabels[wcStatus]}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {useWebContainerView && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setShowLogs(!showLogs)}
              title="Terminal"
            >
              <Terminal className="w-3.5 h-3.5" />
            </Button>
          )}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex-1 p-3 overflow-auto flex items-start justify-center bg-muted/20 ${showLogs ? 'h-[60%]' : ''}`}>
          {project && showIframe ? (
            <div className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 h-full w-full relative ${
              viewModes.find(v => v.key === viewMode)?.width
            }`}>
              {(externalLoading || isProcessing) && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {isProcessing ? statusLabels[wcStatus] : 'Carregando...'}
                    </span>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title={`Preview de ${project.name}`}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                {...(isReactProject && wcPreviewUrl ? { src: wcPreviewUrl } : {})}
              />
            </div>
          ) : project && isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{statusLabels[wcStatus]}</p>
              <p className="text-xs text-muted-foreground/70">Isso pode levar alguns segundos...</p>
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

        {/* WebContainer logs terminal */}
        {showLogs && (
          <div className="h-[40%] border-t border-border bg-[#0a0a0f] overflow-auto p-3 font-mono text-[11px] leading-relaxed">
            <div className="text-muted-foreground/50 mb-2 text-[10px] font-semibold uppercase tracking-wider">
              ⚡ WebContainer Terminal
            </div>
            {wcLogs.map((log, i) => (
              <div key={i} className={`whitespace-pre-wrap ${
                log.startsWith('❌') ? 'text-destructive' :
                log.startsWith('✅') ? 'text-success' :
                log.startsWith('🔄') || log.startsWith('📦') || log.startsWith('🚀') ? 'text-primary' :
                'text-muted-foreground/70'
              }`}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
