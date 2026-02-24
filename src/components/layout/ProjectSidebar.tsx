import { useState, useMemo } from 'react';
import { Search, Lock, GitBranch, Clock, Code2, Github, Shield, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project } from '@/types';
import { mockProjects } from '@/data/mockData';

interface ProjectSidebarProps {
  isGithubConnected: boolean;
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  onConnectGithub: () => void;
}

const ProjectSidebar = ({ isGithubConnected, currentProject, onSelectProject, onConnectGithub }: ProjectSidebarProps) => {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');

  const accounts = useMemo(() => {
    const map: Record<string, number> = {};
    mockProjects.forEach(p => { map[p.account] = (map[p.account] || 0) + 1; });
    return map;
  }, []);

  const filtered = useMemo(() => {
    return mockProjects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchAccount = selectedAccount === 'all' || p.account === selectedAccount;
      return matchSearch && matchAccount;
    });
  }, [search, selectedAccount]);

  const langColors: Record<string, string> = {
    TypeScript: 'bg-blue-500', JavaScript: 'bg-yellow-500', Python: 'bg-green-500',
    Astro: 'bg-orange-500', HTML: 'bg-red-500', Dart: 'bg-cyan-500',
  };

  return (
    <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full shrink-0">
      <div className="p-4 space-y-4 border-b border-sidebar-border">
        {!isGithubConnected ? (
          <div className="gradient-hero rounded-2xl p-5 text-center text-primary-foreground">
            <Github className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <h3 className="font-bold text-lg mb-1">Conecte seu GitHub</h3>
            <p className="text-sm opacity-75 mb-4">Autorize via OAuth para acessar seus projetos</p>
            <button
              onClick={onConnectGithub}
              className="w-full bg-white text-primary font-semibold py-3 rounded-full hover:-translate-y-0.5 hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              <span>🔑</span> Autorizar com GitHub
            </button>
            <div className="flex justify-center gap-4 mt-3 text-xs opacity-80">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> OAuth 2.0</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 2FA</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              JE
            </div>
            <div>
              <p className="font-semibold text-sm">Jeanoli</p>
              <p className="text-xs text-muted-foreground">@jeanoli</p>
            </div>
            <span className="ml-auto text-xs font-medium text-success">● Online</span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projetos..."
            className="pl-9 h-10 rounded-xl bg-card border-sidebar-border text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contas</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedAccount('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedAccount === 'all'
                  ? 'gradient-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-sidebar-accent border border-sidebar-border'
              }`}
            >
              📋 Todos ({mockProjects.length})
            </button>
            {Object.entries(accounts).map(([name, count]) => (
              <button
                key={name}
                onClick={() => setSelectedAccount(name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedAccount === name
                    ? 'gradient-primary text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-sidebar-accent border border-sidebar-border'
                }`}
              >
                {name} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
        <AnimatePresence>
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelectProject(project)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border-2 group ${
                currentProject?.id === project.id
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-transparent bg-card hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{project.name}</span>
                    {project.isPrivate && (
                      <Lock className="w-3 h-3 text-destructive shrink-0" />
                    )}
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
      </div>
    </aside>
  );
};

export default ProjectSidebar;
