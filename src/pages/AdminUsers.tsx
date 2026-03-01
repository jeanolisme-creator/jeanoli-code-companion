import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Shield, ShieldOff, Search, Pencil, Ban, CheckCircle2, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  user_roles: { role: string }[];
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  // Edit user
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-manage-users', { body });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro na operação');
      return null;
    }
    return data;
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const data = await invoke({ action: 'list' });
    if (data?.users) setUsers(data.users);
    setLoading(false);
  }, [invoke]);

  useEffect(() => {
    if (!profile?.isAdmin) { navigate('/'); return; }
    fetchUsers();
  }, [profile, navigate, fetchUsers]);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password) return toast.error('Preencha email e senha');
    setCreating(true);
    const data = await invoke({
      action: 'create',
      email: createForm.email,
      password: createForm.password,
      name: createForm.name || createForm.email.split('@')[0],
    });
    if (data) {
      toast.success('✅ Usuário criado!');
      setCreateForm({ name: '', email: '', password: '' });
      setShowCreate(false);
      fetchUsers();
    }
    setCreating(false);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true);
    const body: Record<string, unknown> = { action: 'update', userId: editUser.id };
    if (editForm.name && editForm.name !== editUser.name) body.name = editForm.name;
    if (editForm.email && editForm.email !== editUser.email) body.email = editForm.email;
    if (editForm.password) body.password = editForm.password;

    const data = await invoke(body);
    if (data) {
      toast.success('Usuário atualizado');
      setEditUser(null);
      fetchUsers();
    }
    setSaving(false);
  };

  const handleToggleBan = async (user: UserRow) => {
    const data = await invoke({ action: 'ban', userId: user.id, banned: !user.banned });
    if (data) {
      toast.success(user.banned ? 'Usuário desbloqueado' : 'Usuário bloqueado');
      fetchUsers();
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    const data = await invoke({ action: 'set_role', userId, role: role === 'none' ? null : role });
    if (data) {
      toast.success('Role atualizado');
      fetchUsers();
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Excluir permanentemente ${user.email}? Esta ação não pode ser desfeita.`)) return;
    const data = await invoke({ action: 'delete', userId: user.id });
    if (data) {
      toast.success('Usuário excluído');
      fetchUsers();
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getUserRole = (u: UserRow) => u.user_roles?.[0]?.role || 'user';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gerenciar Usuários</h1>
              <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gradient-primary text-primary-foreground gap-2">
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : filtered.map(u => (
                <TableRow key={u.id} className={u.banned ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={getUserRole(u)} onValueChange={v => handleSetRole(u.id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Ban className="w-3 h-3" /> Bloqueado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs border-success/30 text-success">
                        <CheckCircle2 className="w-3 h-3" /> Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : 'Nunca'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditUser(u); setEditForm({ name: u.name, email: u.email, password: '' }); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handleToggleBan(u)}
                      >
                        {u.banned ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Ban className="w-3.5 h-3.5 text-warning" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(u)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Cadastrar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" type="email" />
            </div>
            <div>
              <Label className="text-xs">Senha</Label>
              <Input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Senha inicial" type="password" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating} className="gradient-primary text-primary-foreground">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Criando...</> : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} type="email" />
            </div>
            <div>
              <Label className="text-xs">Nova Senha (deixe vazio para manter)</Label>
              <Input value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="••••••••" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={handleUpdate} disabled={saving} className="gradient-primary text-primary-foreground">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvando...</> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
