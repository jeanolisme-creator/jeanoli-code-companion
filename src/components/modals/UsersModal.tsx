import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UsersModalProps {
  open: boolean;
  onClose: () => void;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  user_roles: { role: string }[];
}

const UsersModal = ({ open, onClose }: UsersModalProps) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'list' },
    });
    if (data?.users) setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  const createUser = async () => {
    if (!email || !password) return toast.error('Preencha email e senha');
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'create', email, password, name: name || email.split('@')[0] },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao criar usuário');
    } else {
      toast.success('✅ Usuário criado!');
      setEmail(''); setName(''); setPassword('');
      fetchUsers();
    }
    setCreating(false);
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Excluir ${userEmail}?`)) return;
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'delete', userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao excluir');
    } else {
      toast.success('Usuário excluído');
      fetchUsers();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            Gerenciar Usuários
          </DialogTitle>
        </DialogHeader>

        {/* Create User Form */}
        <div className="bg-muted rounded-xl p-4 border border-border space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Cadastrar Novo Usuário
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="h-9 text-sm" type="email" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Senha</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha inicial" className="h-9 text-sm" type="password" />
          </div>
          <Button onClick={createUser} disabled={creating} className="w-full gradient-primary text-sm">
            {creating ? 'Criando...' : 'Cadastrar Usuário'}
          </Button>
        </div>

        {/* Users List */}
        <div className="space-y-2 mt-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Usuários Cadastrados</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name || u.email.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                {u.user_roles?.some(r => r.role === 'admin') && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => deleteUser(u.id, u.email)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UsersModal;
