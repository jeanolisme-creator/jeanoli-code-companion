import { X, Shield, ShieldCheck, Lock, FileCode, Edit3, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface OAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthorize: () => void;
}

const repos = [
  { name: 'jeanoli/ecommerce-dashboard', lang: 'TypeScript', isPrivate: true, updated: '2 min atrás' },
  { name: 'jeanoli/api-rest-node', lang: 'JavaScript', isPrivate: true, updated: '5h atrás' },
  { name: 'jeanoli/blog-astro', lang: 'Astro', isPrivate: false, updated: '3 dias' },
  { name: 'jeanoli/landing-page', lang: 'HTML', isPrivate: false, updated: '2 semanas' },
  { name: 'mariadev/react-native-app', lang: 'TypeScript', isPrivate: true, updated: '1 semana' },
  { name: 'mariadev/design-system', lang: 'TypeScript', isPrivate: false, updated: '4 dias' },
];

const permissions = [
  { icon: <FileCode className="w-6 h-6 text-primary" />, title: 'Leitura de código', desc: 'Acessar conteúdo dos seus repositórios' },
  { icon: <Edit3 className="w-6 h-6 text-success" />, title: 'Escrita (opcional)', desc: 'Fazer commits em seu nome' },
  { icon: <Lock className="w-6 h-6 text-warning" />, title: 'Repos privados', desc: 'Acesso apenas aos que você autorizar' },
  { icon: <Ban className="w-6 h-6 text-destructive" />, title: 'Sem acesso a:', desc: 'Senhas, tokens ou dados pessoais' },
];

const OAuthModal = ({ open, onClose, onAuthorize }: OAuthModalProps) => {
  const handleAuth = () => {
    toast.info('🔐 Redirecionando para GitHub...');
    setTimeout(() => {
      onAuthorize();
      toast.success('✅ Conectado ao GitHub com sucesso!');
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Autorizar Jeanoli Studio IA
          </DialogTitle>
        </DialogHeader>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Autorização segura via OAuth 2.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            O GitHub irá redirecionar você para autorizar apenas os repositórios selecionados.
          </p>
        </div>

        <h4 className="text-sm font-semibold mb-3">Permissões solicitadas:</h4>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {permissions.map((p) => (
            <div key={p.title} className="bg-muted rounded-xl p-3 border border-border hover:border-primary/30 transition-colors">
              <div className="mb-2">{p.icon}</div>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>

        <h4 className="text-sm font-semibold mb-3">Selecione os repositórios:</h4>
        <div className="border border-border rounded-xl overflow-hidden mb-4">
          <div className="bg-muted px-4 py-2.5 flex items-center gap-2 text-sm font-medium border-b border-border">
            <input type="checkbox" defaultChecked className="rounded" />
            Selecionar todos ({repos.length})
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
            {repos.map((repo) => (
              <label key={repo.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{repo.name}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>{repo.lang}</span>
                    <span>{repo.updated}</span>
                    {repo.isPrivate && <span className="text-destructive">🔒</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAuth} className="gradient-primary">
            <ShieldCheck className="w-4 h-4 mr-1.5" /> Autorizar Acesso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OAuthModal;
