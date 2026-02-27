import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Edit2, Loader2, Users, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { User, CreateUserDto, UpdateUserDto, Enterprise, CreateEnterpriseDto, UpdateEnterpriseDto } from "@/types/api";

const Configuracoes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* ═══ Queries ═══ */
  const { data: users = [], isLoading: loadingUsers } = useQuery({ queryKey: ["users"], queryFn: () => api.users.list() });
  const { data: enterprises = [], isLoading: loadingEnterprises } = useQuery({ queryKey: ["enterprises"], queryFn: () => api.enterprises.list() });

  const [activeTab, setActiveTab] = useState("users");

  /* ═══ Users state ═══ */
  const [userSearch, setUserSearch] = useState("");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserDto>({ email: "", password: "", name: "" });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState<UpdateUserDto>({});
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  /* ═══ Enterprises state ═══ */
  const [entSearch, setEntSearch] = useState("");
  const [newEntOpen, setNewEntOpen] = useState(false);
  const [editEntOpen, setEditEntOpen] = useState(false);
  const [deleteEntOpen, setDeleteEntOpen] = useState(false);
  const [newEnt, setNewEnt] = useState<CreateEnterpriseDto>({ name: "" });
  const [editEnt, setEditEnt] = useState<Enterprise | null>(null);
  const [editEntData, setEditEntData] = useState<UpdateEnterpriseDto>({ name: "" });
  const [deletingEntId, setDeletingEntId] = useState<number | null>(null);

  /* ═══ User Mutations ═══ */
  const createUserMut = useMutation({
    mutationFn: (data: CreateUserDto) => api.users.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setNewUserOpen(false); setNewUser({ email: "", password: "", name: "" }); toast({ title: "Usuário criado!" }); },
    onError: (err: Error) => toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" }),
  });
  const updateUserMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) => api.users.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setEditUserOpen(false); toast({ title: "Usuário atualizado!" }); },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });
  const deleteUserMut = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setDeleteUserOpen(false); toast({ title: "Usuário removido" }); },
    onError: (err: Error) => toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });

  /* ═══ Enterprise Mutations ═══ */
  const createEntMut = useMutation({
    mutationFn: (data: CreateEnterpriseDto) => api.enterprises.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enterprises"] }); setNewEntOpen(false); setNewEnt({ name: "" }); toast({ title: "Empreendimento criado!" }); },
    onError: (err: Error) => toast({ title: "Erro ao criar", description: err.message, variant: "destructive" }),
  });
  const updateEntMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEnterpriseDto }) => api.enterprises.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enterprises"] }); setEditEntOpen(false); toast({ title: "Empreendimento atualizado!" }); },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });
  const deleteEntMut = useMutation({
    mutationFn: (id: number) => api.enterprises.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enterprises"] }); setDeleteEntOpen(false); toast({ title: "Empreendimento removido" }); },
    onError: (err: Error) => toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });

  /* ═══ Filtered data ═══ */
  const filteredUsers = users.filter((u) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredEnterprises = enterprises.filter((e) => !entSearch || e.name.toLowerCase().includes(entSearch.toLowerCase()));

  const isLoading = loadingUsers || loadingEnterprises;
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="ml-3 text-muted-foreground">Carregando...</span></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerenciar usuários e empreendimentos</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1" /> Usuários ({users.length})</TabsTrigger>
          <TabsTrigger value="enterprises"><Building2 className="w-3.5 h-3.5 mr-1" /> Empreendimentos ({enterprises.length})</TabsTrigger>
        </TabsList>

        {/* ═══ USERS TAB ═══ */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar usuário..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10 h-8 text-sm" />
            </div>
            <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Usuário</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Nome</Label><Input className="h-8 text-sm" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></div>
                  <div><Label className="text-xs">Email</Label><Input className="h-8 text-sm" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
                  <div><Label className="text-xs">Senha</Label><Input className="h-8 text-sm" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
                  <Button className="w-full" onClick={() => createUserMut.mutate(newUser)} disabled={createUserMut.isPending}>{createUserMut.isPending ? "Criando..." : "Criar Usuário"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Nome</th>
                  <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Email</th>
                  <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Criado em</th>
                  <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-1.5">
                      <p className="text-sm font-medium leading-tight">{user.name}</p>
                    </td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{user.email}</td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{new Date(user.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditUser(user); setEditUserData({ name: user.name, email: user.email }); setEditUserOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeletingUserId(user.id); setDeleteUserOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ═══ ENTERPRISES TAB ═══ */}
        <TabsContent value="enterprises" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar empreendimento..." value={entSearch} onChange={(e) => setEntSearch(e.target.value)} className="pl-10 h-8 text-sm" />
            </div>
            <Dialog open={newEntOpen} onOpenChange={setNewEntOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Empreendimento</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Empreendimento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Nome</Label><Input className="h-8 text-sm" value={newEnt.name} onChange={(e) => setNewEnt({ ...newEnt, name: e.target.value })} /></div>
                  <Button className="w-full" onClick={() => createEntMut.mutate(newEnt)} disabled={createEntMut.isPending}>{createEntMut.isPending ? "Criando..." : "Criar"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[60px]">ID</th>
                  <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Nome</th>
                  <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Criado em</th>
                  <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnterprises.map((ent) => (
                  <tr key={ent.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-1.5">
                      <span className="text-xs font-mono text-muted-foreground">{ent.id}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="text-sm font-medium leading-tight">{ent.name}</p>
                    </td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{new Date(ent.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditEnt(ent); setEditEntData({ name: ent.name }); setEditEntOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeletingEntId(ent.id); setDeleteEntOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {filteredEnterprises.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum empreendimento encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Edit User Dialog ═══ */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome</Label><Input className="h-8 text-sm" value={editUserData.name || ""} onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} /></div>
            <div><Label className="text-xs">Email</Label><Input className="h-8 text-sm" type="email" value={editUserData.email || ""} onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} /></div>
            <div><Label className="text-xs">Nova Senha (opcional)</Label><Input className="h-8 text-sm" type="password" placeholder="Deixe em branco para manter" value={editUserData.password || ""} onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value || undefined })} /></div>
            <Button className="w-full" onClick={() => { if (editUser) updateUserMut.mutate({ id: editUser.id, data: editUserData }); }} disabled={updateUserMut.isPending}>{updateUserMut.isPending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Enterprise Dialog ═══ */}
      <Dialog open={editEntOpen} onOpenChange={setEditEntOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Empreendimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome</Label><Input className="h-8 text-sm" value={editEntData.name} onChange={(e) => setEditEntData({ name: e.target.value })} /></div>
            <Button className="w-full" onClick={() => { if (editEnt) updateEntMut.mutate({ id: editEnt.id, data: editEntData }); }} disabled={updateEntMut.isPending}>{updateEntMut.isPending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete User Confirm ═══ */}
      <AlertDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este usuário?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingUserId) deleteUserMut.mutate(deletingUserId); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteUserMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Delete Enterprise Confirm ═══ */}
      <AlertDialog open={deleteEntOpen} onOpenChange={setDeleteEntOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este empreendimento? Clientes vinculados podem ser afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingEntId) deleteEntMut.mutate(deletingEntId); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteEntMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Configuracoes;
