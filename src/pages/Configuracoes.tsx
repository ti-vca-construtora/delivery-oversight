import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Users, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { User, Enterprise } from "@/types/api";

const Configuracoes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });
  const { data: enterprises = [], isLoading: loadingEnterprises } = useQuery({
    queryKey: ["enterprises"],
    queryFn: () => api.enterprises.list(),
  });

  const [searchUser, setSearchUser] = useState("");
  const [searchEnterprise, setSearchEnterprise] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newEntOpen, setNewEntOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editEntOpen, setEditEntOpen] = useState(false);
  const [formUser, setFormUser] = useState({ name: "", email: "", password: "" });
  const [formEnt, setFormEnt] = useState({ name: "" });
  const [editFormUser, setEditFormUser] = useState({ name: "", email: "", password: "" });
  const [editFormEnt, setEditFormEnt] = useState({ name: "" });

  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase())
  );
  const filteredEnterprises = enterprises.filter((e) => e.name.toLowerCase().includes(searchEnterprise.toLowerCase()));

  // ─── Mutations ───
  const createUserMut = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormUser({ name: "", email: "", password: "" });
      setNewUserOpen(false);
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" }),
  });

  const updateUserMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; email?: string; password?: string } }) => api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditUserOpen(false);
      setEditingUser(null);
      toast({ title: "Usuário atualizado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar usuário", description: err.message, variant: "destructive" }),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário removido" });
    },
    onError: (err: Error) => toast({ title: "Erro ao remover usuário", description: err.message, variant: "destructive" }),
  });

  const createEntMut = useMutation({
    mutationFn: (data: { name: string }) => api.enterprises.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprises"] });
      setFormEnt({ name: "" });
      setNewEntOpen(false);
      toast({ title: "Empreendimento criado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao criar empreendimento", description: err.message, variant: "destructive" }),
  });

  const updateEntMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) => api.enterprises.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprises"] });
      setEditEntOpen(false);
      setEditingEnterprise(null);
      toast({ title: "Empreendimento atualizado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar empreendimento", description: err.message, variant: "destructive" }),
  });

  const deleteEntMut = useMutation({
    mutationFn: (id: number) => api.enterprises.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprises"] });
      toast({ title: "Empreendimento removido" });
    },
    onError: (err: Error) => toast({ title: "Erro ao remover empreendimento", description: err.message, variant: "destructive" }),
  });

  // ─── Handlers ───
  const handleCreateUser = () => {
    if (!formUser.name || !formUser.email || !formUser.password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    createUserMut.mutate(formUser);
  };

  const handleEditUser = () => {
    if (!editingUser) return;
    const payload: Record<string, string> = {};
    if (editFormUser.name) payload.name = editFormUser.name;
    if (editFormUser.email) payload.email = editFormUser.email;
    if (editFormUser.password) payload.password = editFormUser.password;
    updateUserMut.mutate({ id: editingUser.id, data: payload });
  };

  const handleCreateEnterprise = () => {
    if (!formEnt.name) {
      toast({ title: "Preencha o nome", variant: "destructive" });
      return;
    }
    createEntMut.mutate(formEnt);
  };

  const handleEditEnterprise = () => {
    if (!editingEnterprise) return;
    updateEntMut.mutate({ id: editingEnterprise.id, data: editFormEnt });
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormUser({ name: user.name, email: user.email, password: "" });
    setEditUserOpen(true);
  };

  const openEditEnterprise = (ent: Enterprise) => {
    setEditingEnterprise(ent);
    setEditFormEnt({ name: ent.name });
    setEditEntOpen(true);
  };

  if (loadingUsers || loadingEnterprises) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários e empreendimentos do sistema</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> Usuários ({users.length})
          </TabsTrigger>
          <TabsTrigger value="enterprises" className="gap-2">
            <Building2 className="w-4 h-4" /> Empreendimentos ({enterprises.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══ USERS TAB ═══ */}
        <TabsContent value="users">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar usuário..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Usuário</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input value={formUser.name} onChange={(e) => setFormUser({ ...formUser, name: e.target.value })} placeholder="Nome completo" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formUser.email} onChange={(e) => setFormUser({ ...formUser, email: e.target.value })} placeholder="email@empresa.com" />
                    </div>
                    <div>
                      <Label>Senha</Label>
                      <Input type="password" value={formUser.password} onChange={(e) => setFormUser({ ...formUser, password: e.target.value })} placeholder="••••••••" />
                    </div>
                    <Button onClick={handleCreateUser} className="w-full" disabled={createUserMut.isPending}>
                      {createUserMut.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Criado em</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-foreground">{user.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-5 py-4 text-muted-foreground text-sm hidden sm:table-cell">{new Date(user.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEditUser(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteUserMut.mutate(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Nenhum usuário encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* ═══ ENTERPRISES TAB ═══ */}
        <TabsContent value="enterprises">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar empreendimento..." value={searchEnterprise} onChange={(e) => setSearchEnterprise(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={newEntOpen} onOpenChange={setNewEntOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Novo Empreendimento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Empreendimento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input value={formEnt.name} onChange={(e) => setFormEnt({ name: e.target.value })} placeholder="Nome do empreendimento" />
                    </div>
                    <Button onClick={handleCreateEnterprise} className="w-full" disabled={createEntMut.isPending}>
                      {createEntMut.isPending ? "Criando..." : "Criar Empreendimento"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Criado em</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnterprises.map((ent) => (
                    <tr key={ent.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 text-muted-foreground">#{ent.id}</td>
                      <td className="px-5 py-4 font-medium text-foreground">{ent.name}</td>
                      <td className="px-5 py-4 text-muted-foreground text-sm hidden sm:table-cell">{new Date(ent.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEditEnterprise(ent)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteEntMut.mutate(ent.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredEnterprises.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Nenhum empreendimento encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editFormUser.name} onChange={(e) => setEditFormUser({ ...editFormUser, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editFormUser.email} onChange={(e) => setEditFormUser({ ...editFormUser, email: e.target.value })} />
            </div>
            <div>
              <Label>Nova Senha (opcional)</Label>
              <Input type="password" value={editFormUser.password} onChange={(e) => setEditFormUser({ ...editFormUser, password: e.target.value })} placeholder="Deixe vazio para manter" />
            </div>
            <Button onClick={handleEditUser} className="w-full" disabled={updateUserMut.isPending}>
              {updateUserMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Enterprise Dialog */}
      <Dialog open={editEntOpen} onOpenChange={setEditEntOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empreendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editFormEnt.name} onChange={(e) => setEditFormEnt({ name: e.target.value })} />
            </div>
            <Button onClick={handleEditEnterprise} className="w-full" disabled={updateEntMut.isPending}>
              {updateEntMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Configuracoes;
