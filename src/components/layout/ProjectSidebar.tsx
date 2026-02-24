import { useState, useMemo, useEffect } from 'react';
import { Search, Lock, GitBranch, Clock, Github, Shield, ShieldCheck, Link2, Loader2, AlertCircle, KeyRound, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';

interface ProjectSidebarProps {
  isGithubConnected: boolean;
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  onConnectGithub: () => void;
}

const ProjectSidebar = ({ isGithubConnected, currentProject, onSelectProject, onConnectGithub }: ProjectSidebarProps) => {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [showGithubAuthModal, setShowGithubAuthModal] = useState(false);
  const [pendingRepoUrl, setPendingRepoUrl] = useState('');
  const [githubLogin, setGithubLogin] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [authImportLoading, setAuthImportLoading] = useState(false);

  const { projects, savedCredentials, saveProject, deleteProject } = useProjects();

  // Pre-fill saved credentials
  useEffect(() => {
    if (savedCredentials) {
      setGithubLogin(savedCredentials.login);
      setGithubToken(savedCredentials.token);
    }
  }, [savedCredentials]);

  const accounts = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => { map[p.account] = (map[p.account] || 0) + 1; });
    return map;
  }, [projects]);

  const isGithubUrl = (text: string) => {
    const t = text.trim();
    return t.includes('github.com/') || t.match(/^[^/\s]+\/[^/\s]+$/);
  };

  const filtered = useMemo(() => {
    if (isGithubUrl(search)) return projects;
    return projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.fullName.toLowerCase().includes(search.toLowerCase());
      const matchAccount = selectedAccount === 'all' || p.account === selectedAccount;
      return matchSearch && matchAccount;
    });
  }, [search, selectedAccount, projects]);

  const langColors: Record<string, string> = {
    TypeScript: 'bg-blue-500', JavaScript: 'bg-yellow-500', Python: 'bg-green-500',
    Astro: 'bg-orange-500', HTML: 'bg-red-500', Dart: 'bg-cyan-500',
    Ruby: 'bg-red-600', Go: 'bg-cyan-600', Rust: 'bg-orange-600',
  };

  const parseGithubUrl = (url: string): { owner: string; repo: string } | null => {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const httpsMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
    const sshMatch = cleaned.match(/git@github\.com:([^/]+)\/([^/]+)/);
    if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
    const shortMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
  };

  const importFromGithub = async (urlOverride?: string, token?: string) => {
    const url = (urlOverride || githubUrl).trim();
    if (!url) return;

    setImportError('');
    const parsed = parseGithubUrl(url);
    if (!parsed) {
      const message = 'URL inválida. Use: https://github.com/user/repo';
      setImportError(message);
      toast.error(message);
      return;
    }

    setIsLoading(true);
    toast.info('🔎 Buscando repositório no GitHub...');

    try {
      const { data, error } = await supabase.functions.invoke('github-repo-lookup', {
        body: { owner: parsed.owner, repo: parsed.repo, ...(token ? { token } : {}) },
      });

      if (error) {
        setImportError('Erro ao conectar com o backend.');
        toast.error('Erro ao conectar com o backend.');
        return;
      }

      if (!data?.ok) {
        if ((data?.requiresAuth || data?.status === 404) && !token) {
          setPendingRepoUrl(url);
          setShowGithubAuthModal(true);
          setImportError('Repositório possivelmente privado. Autentique para importar.');
          toast.warning('🔐 Repositório privado detectado.');
        } else {
          const message = data?.error || 'Repositório não encontrado.';
          setImportError(message);
          toast.error(message);
        }
        return;
      }

      const repo = data.repo;
      const exists = projects.some((p) => p.fullName.toLowerCase() === String(repo.fullName).toLowerCase());
      if (exists) {
        toast.info('📁 Projeto já está na lista!');
        setGithubUrl('');
        setSearch('');
        return;
      }

      const newProject: Project = {
        id: Date.now(),
        name: repo.name,
        fullName: repo.fullName,
        account: repo.owner,
        accountAvatar: repo.owner.substring(0, 2).toUpperCase(),
        isPrivate: repo.private,
        lastSync: 'agora',
        language: repo.language || 'Unknown',
        branch: repo.defaultBranch || 'main',
        token: token || undefined,
      };

      await saveProject(newProject, githubLogin, token);
      onSelectProject(newProject);
      setGithubUrl('');
      setSearch('');
      setPendingRepoUrl('');
      setShowGithubAuthModal(false);
      toast.success(`✅ ${repo.name} importado e salvo!`);
    } catch {
      setImportError('Erro de conexão com GitHub.');
      toast.error('Erro de conexão com GitHub.');
    } finally {
      setIsLoading(false);
    }
  };

  const importPrivateWithAuth = async () => {
    const repoUrl = pendingRepoUrl || search || githubUrl;
    if (!repoUrl.trim()) { toast.error('Informe a URL do repositório.'); return; }
    if (!githubToken.trim()) { toast.error('Informe o token do GitHub.'); return; }
    setAuthImportLoading(true);
    await importFromGithub(repoUrl, githubToken.trim());
    setAuthImportLoading(false);
  };

  return (
    <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full shrink-0">
      <div className="p-4 space-y-4 border-b border-sidebar-border">
        {!isGithubConnected ? (
          <div className="gradient-hero rounded-2xl p-5 text-center text-primary-foreground">
            <Github className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <h3 className="font-bold text-lg mb-1">Conecte seu GitHub</h3>
            <p className="text-sm opacity-75 mb-4">Autorize via OAuth para acessar seus projetos</p>
            <button onClick={onConnectGithub} className="w-full bg-white text-primary font-semibold py-3 rounded-full hover:-translate-y-0.5 hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2">
              <span>🔑</span> Autorizar com GitHub
            </button>
            <div className="flex justify-center gap-4 mt-3 text-xs opacity-80">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> OAuth 2.0</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 2FA</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                {savedCredentials?.login?.substring(0, 2).toUpperCase() || 'GH'}
              </div>
              <div>
                <p className="font-semibold text-sm">{savedCredentials?.login || 'GitHub'}</p>
                <p className="text-xs text-muted-foreground">{projects.length} projetos salvos</p>
              </div>
              <span className="ml-auto text-xs font-medium text-success">● Online</span>
            </div>

            <div className="bg-card rounded-xl p-3 border border-border space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Importar do GitHub
              </label>
              <div className="flex gap-2">
                <Input
                  value={githubUrl}
                  onChange={(e) => { setGithubUrl(e.target.value); setImportError(''); }}
                  placeholder="github.com/user/repo"
                  className="h-8 text-xs rounded-lg bg-muted/50"
                  onKeyDown={(e) => { if (e.key === 'Enter') importFromGithub(); }}
                />
                <Button size="sm" onClick={() => importFromGithub()} disabled={isLoading || !githubUrl.trim()} className="h-8 px-3 text-xs gradient-primary rounded-lg shrink-0">
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
              {importError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {importError}
                </p>
              )}
            </div>
          </>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isGithubUrl(search.trim())) {
                e.preventDefault();
                importFromGithub(search.trim());
              }
            }}
            placeholder="Buscar projetos ou colar URL..."
            className="pl-9 h-10 rounded-xl bg-card border-sidebar-border text-sm"
          />
        </div>

        {Object.keys(accounts).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contas</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedAccount('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedAccount === 'all' ? 'gradient-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground hover:bg-sidebar-accent border border-sidebar-border'}`}
              >
                📋 Todos ({projects.length})
              </button>
              {Object.entries(accounts).map(([name, count]) => (
                <button key={name} onClick={() => setSelectedAccount(name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedAccount === name ? 'gradient-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground hover:bg-sidebar-accent border border-sidebar-border'}`}
                >
                  {name} ({count})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
        {projects.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Github className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Nenhum projeto</p>
            <p className="text-xs">Importe um repositório do GitHub acima</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((project, i) => (
              <motion.div
                key={project.fullName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelectProject(project)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border-2 group relative ${
                  currentProject?.fullName === project.fullName
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-transparent bg-card hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5'
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProject(project.fullName); toast.info('Projeto removido'); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                  title="Remover projeto"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{project.name}</span>
                      {project.isPrivate && <Lock className="w-3 h-3 text-destructive shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{project.fullName}</p>
                  </div>
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground pt-2 border-t border-sidebar-border">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.lastSync}</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${langColors[project.language] || 'bg-muted-foreground'}`} />
                    {project.language}
                  </span>
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{project.branch}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Dialog open={showGithubAuthModal} onOpenChange={(open) => { setShowGithubAuthModal(open); }}>
        <DialogContent className="max-w-md rounded-2xl border-border/70">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-4 h-4 text-primary" />
              Conectar para repositório privado
            </DialogTitle>
            <DialogDescription className="text-xs">
              Use um token pessoal (PAT) do GitHub. Suas credenciais serão salvas para uso futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email/usuário GitHub</label>
              <Input value={githubLogin} onChange={(e) => setGithubLogin(e.target.value)} placeholder="seu-usuario ou email" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Token GitHub (PAT)</label>
              <Input value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." type="password" className="h-9 text-sm" />
            </div>
            <p className="text-[11px] text-success flex items-center gap-1">
              ✅ Suas credenciais serão salvas de forma segura para uso futuro.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowGithubAuthModal(false)}>Cancelar</Button>
              <Button size="sm" className="gradient-primary" onClick={importPrivateWithAuth} disabled={authImportLoading}>
                {authImportLoading ? 'Conectando...' : 'Conectar e importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
};

export default ProjectSidebar;
