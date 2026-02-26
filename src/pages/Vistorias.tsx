import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, List, CalendarDays, Users2, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Inspection, EligibleClient, CreateInspectionDto, UpdateInspectionDto } from "@/types/api";

const statusColors: Record<string, string> = {
  AGUARDANDO: "bg-warning/10 text-warning border-warning/20",
  ACEITE: "bg-success/10 text-success border-success/20",
  RECUSA: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELADA: "bg-muted text-muted-foreground border-border",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const Vistorias = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Queries ───
  const { data: inspections = [], isLoading: loadingInspections } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => api.inspections.list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.list(),
  });
  const { data: eligible = [] } = useQuery({
    queryKey: ["eligible"],
    queryFn: () => api.eligible.list(),
  });

  // ─── Local state ───
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [eligibleOpen, setEligibleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [preSelectedClient, setPreSelectedClient] = useState<number | null>(null);
  const [preSelectedRejection, setPreSelectedRejection] = useState<number | null>(null);

  // New inspection form
  const [newForm, setNewForm] = useState<CreateInspectionDto>({ idclient: 0, datetime: "", inspector: "", mobuss: false, obs: "" });

  // Edit form
  const [editForm, setEditForm] = useState<UpdateInspectionDto>({});

  // ─── Mutations ───
  const createMut = useMutation({
    mutationFn: (data: CreateInspectionDto) => api.inspections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["eligible"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setNewForm({ idclient: 0, datetime: "", inspector: "", mobuss: false, obs: "" });
      setPreSelectedClient(null);
      setPreSelectedRejection(null);
      setNewOpen(false);
      toast({ title: "Vistoria criada com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao criar vistoria", description: err.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInspectionDto }) => api.inspections.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["rejections"] });
      queryClient.invalidateQueries({ queryKey: ["eligible"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setEditOpen(false);
      setEditingInspection(null);
      toast({ title: "Vistoria atualizada!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar vistoria", description: err.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.inspections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["eligible"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      toast({ title: "Vistoria removida" });
    },
    onError: (err: Error) => toast({ title: "Erro ao remover vistoria", description: err.message, variant: "destructive" }),
  });

  // ─── Computed ───
  const filtered = useMemo(() => {
    return inspections.filter((ins) => {
      const client = clients.find((c) => c.id === ins.idclient);
      const matchSearch = client?.name.toLowerCase().includes(search.toLowerCase()) || ins.inspector?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || ins.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [search, filterStatus, inspections, clients]);

  // Calendar grouping
  const calendarDays = useMemo(() => {
    const days: Record<string, Inspection[]> = {};
    filtered.forEach((ins) => {
      const day = ins.datetime.split("T")[0];
      if (!days[day]) days[day] = [];
      days[day].push(ins);
    });
    return Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const eligibleNew = eligible.filter((e) => e.type === "new");
  const eligibleAgain = eligible.filter((e) => e.type === "again");

  // ─── Handlers ───
  const handleCreate = () => {
    if (!newForm.idclient || !newForm.datetime) {
      toast({ title: "Preencha cliente e data", variant: "destructive" });
      return;
    }
    const payload: CreateInspectionDto = {
      idclient: newForm.idclient,
      datetime: new Date(newForm.datetime).toISOString(),
    };
    if (newForm.inspector) payload.inspector = newForm.inspector;
    if (newForm.mobuss) payload.mobuss = newForm.mobuss;
    if (newForm.obs) payload.obs = newForm.obs;
    if (preSelectedRejection) payload.idprerejection = preSelectedRejection;
    createMut.mutate(payload);
  };

  const handleUpdate = () => {
    if (!editingInspection) return;
    updateMut.mutate({ id: editingInspection.id, data: editForm });
  };

  const openEdit = (ins: Inspection) => {
    setEditingInspection(ins);
    setEditForm({ status: ins.status, inspector: ins.inspector || "", obs: ins.obs || "", mobuss: ins.mobuss });
    setEditOpen(true);
  };

  const openNewFromEligible = (el: EligibleClient) => {
    setPreSelectedClient(el.id);
    setPreSelectedRejection(el.idrejection);
    setNewForm({ idclient: el.id, datetime: "", inspector: "", mobuss: false, obs: el.type === "again" ? "Reagendamento após recusa" : "" });
    setEligibleOpen(false);
    setNewOpen(true);
  };

  if (loadingInspections) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando vistorias...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vistorias</h1>
          <p className="text-sm text-muted-foreground">Agendamento e acompanhamento de vistorias</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Eligible popover */}
          <Popover open={eligibleOpen} onOpenChange={setEligibleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Users2 className="w-4 h-4 mr-2" /> Aptos
                {eligible.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {eligible.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold text-sm text-foreground">Clientes aptos para agendar</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{eligibleNew.length} novo(s) · {eligibleAgain.length} reagendamento(s)</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {eligible.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nenhum cliente apto no momento</p>}
                {eligible.map((el) => (
                  <button
                    key={el.id}
                    className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                    onClick={() => openNewFromEligible(el)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{el.name}</p>
                        <p className="text-xs text-muted-foreground">{el.unit} — {el.nameenterprise}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${el.type === "new" ? "bg-success/10 text-success border-success/20" : "bg-info/10 text-info border-info/20"}`}>
                        {el.type === "new" ? "Novo" : "Re-agendar"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Nova Vistoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {preSelectedClient ? `Agendar Vistoria — ${clients.find((c) => c.id === preSelectedClient)?.name}` : "Nova Vistoria"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cliente</Label>
                  <Select
                    value={newForm.idclient ? String(newForm.idclient) : ""}
                    onValueChange={(v) => setNewForm({ ...newForm, idclient: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} — {c.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data e Hora</Label>
                  <Input type="datetime-local" value={newForm.datetime} onChange={(e) => setNewForm({ ...newForm, datetime: e.target.value })} />
                </div>
                <div>
                  <Label>Vistoriador</Label>
                  <Input placeholder="Nome do vistoriador" value={newForm.inspector || ""} onChange={(e) => setNewForm({ ...newForm, inspector: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={newForm.mobuss || false} onCheckedChange={(v) => setNewForm({ ...newForm, mobuss: v })} id="mobuss-new" />
                  <Label htmlFor="mobuss-new">Mobuss</Label>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input placeholder="Observações (opcional)" value={newForm.obs || ""} onChange={(e) => setNewForm({ ...newForm, obs: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={createMut.isPending}>
                  {createMut.isPending ? "Criando..." : "Criar Vistoria"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou vistoriador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
            <SelectItem value="ACEITE">Aceite</SelectItem>
            <SelectItem value="RECUSA">Recusa</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <CalendarDays className="w-4 h-4" /> Calendário
          </button>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Vistoriador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Mobuss</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Obs</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ins) => {
                    const client = clients.find((c) => c.id === ins.idclient);
                    return (
                      <tr key={ins.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{client?.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">{client?.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(ins.datetime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{ins.inspector || "—"}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {ins.mobuss ? (
                            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Sim</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ins.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate hidden lg:table-cell">{ins.obs || "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ins)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => deleteMut.mutate(ins.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma vistoria encontrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {calendarDays.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">Nenhuma vistoria encontrada</div>
            )}
            {calendarDays.map(([day, items]) => (
              <div key={day} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    {new Date(day + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                  </h3>
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {items.length} vistoria(s)
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((ins) => {
                    const client = clients.find((c) => c.id === ins.idclient);
                    return (
                      <div key={ins.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-mono text-primary font-medium w-14 flex-shrink-0">
                            {new Date(ins.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {client?.name} <span className="text-muted-foreground">— {client?.unit}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{ins.inspector || "Vistoriador não definido"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={ins.status} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ins)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Vistoria #{editingInspection?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status || ""} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                  <SelectItem value="ACEITE">Aceite</SelectItem>
                  <SelectItem value="RECUSA">Recusa</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vistoriador</Label>
              <Input value={editForm.inspector || ""} onChange={(e) => setEditForm({ ...editForm, inspector: e.target.value })} placeholder="Nome do vistoriador" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editForm.mobuss || false} onCheckedChange={(v) => setEditForm({ ...editForm, mobuss: v })} id="mobuss-edit" />
              <Label htmlFor="mobuss-edit">Mobuss</Label>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={editForm.obs || ""} onChange={(e) => setEditForm({ ...editForm, obs: e.target.value })} placeholder="Observações" />
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vistorias;
