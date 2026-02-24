import { useState, useMemo } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Globe, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Project } from '@/types';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface PreviewPanelProps {
  project?: Project | null;
}

const PreviewPanel = ({ project }: PreviewPanelProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [iframeKey, setIframeKey] = useState(0);

  const viewModes: { key: ViewMode; icon: typeof Monitor; label: string; width: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop', width: 'w-full' },
    { key: 'tablet', icon: Tablet, label: 'Tablet', width: 'max-w-[768px]' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 'max-w-[375px]' },
  ];

  // Build preview URLs from the project
  const previewUrls = useMemo(() => {
    if (!project) return null;
    const [owner, repo] = project.fullName.split('/');
    if (!owner || !repo) return null;

    return {
      githubPages: `https://${owner}.github.io/${repo}/`,
      githubRepo: `https://github.com/${owner}/${repo}`,
      rawReadme: `https://raw.githubusercontent.com/${owner}/${repo}/${project.branch}/README.md`,
    };
  }, [project]);

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
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
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {project && previewUrls && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(previewUrls.githubRepo, '_blank')}
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

      <div className="flex-1 p-5 overflow-auto flex items-start justify-center bg-muted/20">
        {project && previewUrls ? (
          <div
            className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 h-full w-full ${
              viewModes.find(v => v.key === viewMode)?.width
            }`}
          >
            <iframe
              key={iframeKey}
              src={previewUrls.githubPages}
              className="w-full h-full border-0"
              title={`Preview de ${project.name}`}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onError={() => toast.error('Não foi possível carregar o preview.')}
            />
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
