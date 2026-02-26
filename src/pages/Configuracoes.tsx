import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ModuleLayout from "@/components/ModuleLayout";
import { mockUsers, mockEnterprises } from "@/lib/mock-data";
import type { User, Enterprise } from "@/types/api";

const Configuracoes = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [enterprises, setEnterprises] = useState<Enterprise[]>(mockEnterprises);
  const [searchUser, setSearchUser] = useState("");
  const [searchEnterprise, setSearchEnterprise] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newEntOpen, setNewEntOpen] = useState(false);
  const [formUser, setFormUser] = useState({ name: "", email: "", password: "" });
  const [formEnt, setFormEnt] = useState({ name: "" });
  const { toast } = useToast();

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()));
  const filteredEnterprises = enterprises.filter(e => e.name.toLowerCase().includes(searchEnterprise.toLowerCase()));

  const handleCreateUser = () => {
    const newUser: User = { id: `u${Date.now()}`, ...formUser, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setUsers([...users, newUser]);
    setFormUser({ name: "", email: "", password: "" });
    setNewUserOpen(false);
    toast({ title: "Usuário criado com sucesso!" });
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
    toast({ title: "Usuário removido" });
  };

  const handleCreateEnterprise = () => {
    const newEnt: Enterprise = { id: Date.now(), name: formEnt.name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setEnterprises([...enterprises, newEnt]);
    setFormEnt({ name: "" });
    setNewEntOpen(false);
    toast({ title: "Empreendimento criado com sucesso!" });
  };

  const handleDeleteEnterprise = (id: number) => {
    setEnterprises(enterprises.filter(e => e.id !== id));
    toast({ title: "Empreendimento removido" });
  };

  return (
    <ModuleLayout title="Configurações">
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="enterprises" className="gap-2"><Building2 className="w-4 h-4" /> Empreendimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar usuário..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> Novo Usuário</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome</Label><Input value={formUser.name} onChange={e => setFormUser({ ...formUser, name: e.target.value })} /></div>
                    <div><Label>Email</Label><Input type="email" value={formUser.email} onChange={e => setFormUser({ ...formUser, email: e.target.value })} /></div>
                    <div><Label>Senha</Label><Input type="password" value={formUser.password} onChange={e => setFormUser({ ...formUser, password: e.target.value })} /></div>
                    <Button onClick={handleCreateUser} className="w-full">Criar Usuário</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criado em</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr></thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-foreground">{user.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-5 py-4 text-muted-foreground text-sm">{new Date(user.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteUser(user.id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="enterprises">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar empreendimento..." value={searchEnterprise} onChange={e => setSearchEnterprise(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={newEntOpen} onOpenChange={setNewEntOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> Novo Empreendimento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Empreendimento</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome</Label><Input value={formEnt.name} onChange={e => setFormEnt({ name: e.target.value })} /></div>
                    <Button onClick={handleCreateEnterprise} className="w-full">Criar Empreendimento</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criado em</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr></thead>
                <tbody>
                  {filteredEnterprises.map(ent => (
                    <tr key={ent.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 text-muted-foreground">#{ent.id}</td>
                      <td className="px-5 py-4 font-medium text-foreground">{ent.name}</td>
                      <td className="px-5 py-4 text-muted-foreground text-sm">{new Date(ent.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEnterprise(ent.id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
};

export default Configuracoes;
