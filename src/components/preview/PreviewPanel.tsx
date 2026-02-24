import { useState, useMemo } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Globe, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);

  const viewModes: { key: ViewMode; icon: typeof Monitor; label: string; width: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop', width: 'w-full' },
    { key: 'tablet', icon: Tablet, label: 'Tablet', width: 'max-w-[768px]' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 'max-w-[375px]' },
  ];

  const previewHtml = useMemo(() => {
    if (!project) return '';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${project.name} — Live Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #e4e4e7; min-height: 100vh; }
    
    .nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; border-bottom: 1px solid #1e1e2e; background: #0f0f18; position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); }
    .nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: #fff; }
    .nav-brand .logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: #fff; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #a1a1aa; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover { color: #fff; }
    .nav-actions { display: flex; gap: 8px; }
    .btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-ghost { background: transparent; color: #a1a1aa; border: 1px solid #27272a; }
    .btn-ghost:hover { border-color: #6366f1; color: #fff; }
    .btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
    
    .hero { padding: 80px 32px; text-align: center; max-width: 720px; margin: 0 auto; }
    .hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); color: #818cf8; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
    .hero h1 { font-size: 48px; font-weight: 800; line-height: 1.1; margin-bottom: 16px; background: linear-gradient(135deg, #fff 30%, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 18px; color: #71717a; line-height: 1.6; margin-bottom: 32px; }
    .hero-actions { display: flex; gap: 12px; justify-content: center; }
    
    .features { padding: 64px 32px; max-width: 960px; margin: 0 auto; }
    .features-title { text-align: center; font-size: 28px; font-weight: 700; margin-bottom: 40px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .feature-card { background: #111119; border: 1px solid #1e1e2e; border-radius: 16px; padding: 28px; transition: all 0.3s; }
    .feature-card:hover { border-color: #6366f1; transform: translateY(-4px); box-shadow: 0 12px 32px rgba(99,102,241,0.1); }
    .feature-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15)); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 16px; }
    .feature-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .feature-card p { font-size: 14px; color: #71717a; line-height: 1.5; }
    
    .stats { display: flex; justify-content: center; gap: 48px; padding: 48px 32px; border-top: 1px solid #1e1e2e; border-bottom: 1px solid #1e1e2e; margin: 32px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: 800; color: #818cf8; }
    .stat-label { font-size: 13px; color: #52525b; margin-top: 4px; }
    
    .footer { text-align: center; padding: 32px; color: #3f3f46; font-size: 13px; }
    
    @media (max-width: 640px) {
      .hero h1 { font-size: 32px; }
      .hero { padding: 48px 20px; }
      .nav-links { display: none; }
      .stats { flex-wrap: wrap; gap: 24px; }
      .hero-actions { flex-direction: column; align-items: center; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-brand">
      <div class="logo">${project.name.charAt(0).toUpperCase()}</div>
      ${project.name}
    </div>
    <div class="nav-links">
      <a href="#">Início</a>
      <a href="#">Recursos</a>
      <a href="#">Docs</a>
      <a href="#">Preços</a>
    </div>
    <div class="nav-actions">
      <button class="btn btn-ghost">Login</button>
      <button class="btn btn-primary">Começar grátis</button>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-badge">✨ ${project.language} • ${project.branch}</div>
    <h1>${project.name.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</h1>
    <p>Aplicação moderna construída com ${project.language}. Gerencie, explore e colabore com facilidade.</p>
    <div class="hero-actions">
      <button class="btn btn-primary" style="padding: 12px 28px; font-size: 15px;">🚀 Acessar agora</button>
      <button class="btn btn-ghost" style="padding: 12px 28px; font-size: 15px;">📖 Documentação</button>
    </div>
  </section>

  <div class="stats">
    <div class="stat"><div class="stat-value">2.4k</div><div class="stat-label">Usuários ativos</div></div>
    <div class="stat"><div class="stat-value">99.9%</div><div class="stat-label">Uptime</div></div>
    <div class="stat"><div class="stat-value">150+</div><div class="stat-label">Integrações</div></div>
    <div class="stat"><div class="stat-value">4.9★</div><div class="stat-label">Avaliação</div></div>
  </div>

  <section class="features">
    <h2 class="features-title">Recursos principais</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">📚</div>
        <h3>Gerenciamento completo</h3>
        <p>Organize e gerencie todos os seus recursos em um painel centralizado e intuitivo.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔍</div>
        <h3>Busca inteligente</h3>
        <p>Encontre o que precisa rapidamente com filtros avançados e busca em tempo real.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Analytics e relatórios</h3>
        <p>Acompanhe métricas detalhadas e gere relatórios automatizados.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔐</div>
        <h3>Segurança avançada</h3>
        <p>Autenticação robusta, criptografia e controle de acesso granular.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Performance otimizada</h3>
        <p>Carregamento ultrarrápido com cache inteligente e CDN global.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Design responsivo</h3>
        <p>Interface adaptável que funciona perfeitamente em qualquer dispositivo.</p>
      </div>
    </div>
  </section>

  <footer class="footer">
    <p>© 2025 ${project.name} — ${project.fullName} • Feito com ❤️</p>
  </footer>
</body>
</html>`;
  }, [project]);

  const handleRefresh = () => {
    setIsLoading(true);
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
          {project && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
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
        {project ? (
          <div
            className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 h-full w-full relative ${
              viewModes.find(v => v.key === viewMode)?.width
            }`}
          >
            {isLoading && (
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
              onLoad={() => setIsLoading(false)}
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
