import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Upload, Pencil, Trash2, Clock, Filter, Eye, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Client, Overview, CreateClientDto, UpdateOverviewDto, TimelineEvent } from "@/types/api";

const statusColors: Record<string, string> = {
  PENDENTE: "bg-warning/10 text-warning border-warning/20",
  "EM ANDAMENTO": "bg-info/10 text-info border-info/20",
  LIBERADA: "bg-success/10 text-success border-success/20",
  ACEITE: "bg-success/10 text-success border-success/20",
  AGUARDANDO: "bg-warning/10 text-warning border-warning/20",
  RECUSA: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELADA: "bg-muted text-muted-foreground border-border",
  ATIVO: "bg-success/10 text-success border-success/20",
  INATIVO: "bg-muted text-muted-foreground border-border",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const eventIcons: Record<string, string> = {
  CLIENT_CREATED: "\uD83C\uDFF7\uFE0F",
  UNIT_RELEASED: "\uD83D\uDD13",
  INSPECTION_SCHEDULED: "\uD83D\uDCC5",
  INSPECTION_APPROVED: "\u2705",
  INSPECTION_REJECTED: "\u274C",
  REJECTION_RESOLVED: "\uD83D\uDD04",
};

const Clientes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Queries ───
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.list(),
  });
  const { data: overviews = [], isLoading: loadingOverviews } = useQuery({
    queryKey: ["overviews"],
    queryFn: () => api.overview.list(),
  });
  const { data: enterprises = [] } = useQuery({
    queryKey: ["enterprises"],
    queryFn: () => api.enterprises.list(),
  });
  const { data: eligible = [] } = useQuery({
    queryKey: ["eligible"],
    queryFn: () => api.eligible.list(),
  });

  // ─── Local state ───
  const [search, setSearch] = useState("");
  const [filterEnterprise, setFilterEnterprise] = useState<string>("all");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [editOverview, setEditOverview] = useState<Overview | null>(null);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New client form
  const [newClient, setNewClient] = useState<CreateClientDto>({ name: "", unit: "", seller: "", identerprise: 0 });

  // ─── Mutations ───
  const createClientMut = useMutation({
    mutationFn: (data: CreateClientDto) => api.clients.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setNewClient({ name: "", unit: "", seller: "", identerprise: 0 });
      setNewClientOpen(false);
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" }),
  });

  const updateClientMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => api.clients.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setEditClientOpen(false);
      setEditingClient(null);
      toast({ title: "Cliente atualizado!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar cliente", description: err.message, variant: "destructive" }),
  });

  const deleteClientMut = useMutation({
    mutationFn: (id: number) => api.clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      toast({ title: "Cliente removido" });
    },
    onError: (err: Error) => toast({ title: "Erro ao remover cliente", description: err.message, variant: "destructive" }),
  });

  const updateOverviewMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOverviewDto }) => api.overview.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setOverviewOpen(false);
      setEditOverview(null);
      toast({ title: "Overview atualizado!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar overview", description: err.message, variant: "destructive" }),
  });

  const importClientsMut = useMutation({
    mutationFn: (data: CreateClientDto[]) => api.clients.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setImportOpen(false);
      toast({ title: `Importação concluída: ${result.inserted} inseridos, ${result.skipped} ignorados` });
    },
    onError: (err: Error) => toast({ title: "Erro na importação", description: err.message, variant: "destructive" }),
  });

  // ─── Computed ───
  const filtered = useMemo(() => {
    return overviews.filter((o) => {
      const client = o.client || clients.find((c) => c.id === o.idclient);
      if (!client) return false;
      const matchSearch = client.name.toLowerCase().includes(search.toLowerCase()) || client.unit.toLowerCase().includes(search.toLowerCase());
      const matchEnterprise = filterEnterprise === "all" || String(client.identerprise) === filterEnterprise;
      return matchSearch && matchEnterprise;
    });
  }, [search, filterEnterprise, overviews, clients]);

  const remanescentes = overviews.filter((o) => o.remanescente);

  // ─── Handlers ───
  const handleCreateClient = () => {
    if (!newClient.name || !newClient.unit || !newClient.seller || !newClient.identerprise) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    createClientMut.mutate(newClient);
  };

  const handleEditClient = () => {
    if (!editingClient) return;
    updateClientMut.mutate({
      id: editingClient.id,
      data: { name: editingClient.name, unit: editingClient.unit, seller: editingClient.seller, identerprise: editingClient.identerprise },
    });
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const mapped: CreateClientDto[] = rows.map((r) => ({
        name: r.nome || r.name || "",
        unit: r.unidade || r.unit || "",
        seller: r.vendedor || r.seller || "",
        identerprise: Number(r.id_empreendimento || r.identerprise || 0),
      }));
      importClientsMut.mutate(mapped);
    } catch {
      toast({ title: "Erro ao ler arquivo", variant: "destructive" });
    }
  };

  const handleSaveOverview = () => {
    if (!editOverview || !editOverview.id) return;
    updateOverviewMut.mutate({
      id: editOverview.id,
      data: {
        status: editOverview.status,
        situation: editOverview.situation,
        status_quality: editOverview.status_quality,
        status_delivery: editOverview.status_delivery,
        obs: editOverview.obs,
      },
    });
  };

  const openOverview = (ov: Overview) => {
    setEditOverview({ ...ov });
    setOverviewOpen(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient({ ...client });
    setEditClientOpen(true);
  };

  const openTimeline = async (clientId: number) => {
    setSelectedClient(clientId);
    setTimelineEvents([]);
    setTimelineOpen(true);
    try {
      const tl = await api.timeline.get(clientId);
      setTimelineEvents(tl.events);
    } catch {
      toast({ title: "Erro ao carregar timeline", variant: "destructive" });
    }
  };

  const getClientForOverview = (ov: Overview) => ov.client || clients.find((c) => c.id === ov.idclient);

  if (loadingClients || loadingOverviews) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral de Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro, overview, elegibilidade e timeline dos clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" /> Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Clientes (XLSX/CSV)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Formato esperado</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O arquivo deve conter as colunas: <strong>nome</strong>, <strong>unidade</strong>, <strong>vendedor</strong>, <strong>id_empreendimento</strong>
                  </p>
                </div>
                <Input ref={fileInputRef} type="file" accept=".xlsx,.csv" />
                <Button onClick={handleImport} className="w-full" disabled={importClientsMut.isPending}>
                  {importClientsMut.isPending ? "Importando..." : "Importar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input placeholder="Nome do cliente" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Input placeholder="Apto 101" value={newClient.unit} onChange={(e) => setNewClient({ ...newClient, unit: e.target.value })} />
                </div>
                <div>
                  <Label>Vendedor</Label>
                  <Input placeholder="Nome do vendedor" value={newClient.seller} onChange={(e) => setNewClient({ ...newClient, seller: e.target.value })} />
                </div>
                <div>
                  <Label>Empreendimento</Label>
                  <Select value={newClient.identerprise ? String(newClient.identerprise) : ""} onValueChange={(v) => setNewClient({ ...newClient, identerprise: Number(v) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {enterprises.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreateClient} disabled={createClientMut.isPending}>
                  {createClientMut.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Visão Geral ({overviews.length})</TabsTrigger>
          <TabsTrigger value="remanescentes">Remanescentes ({remanescentes.length})</TabsTrigger>
          <TabsTrigger value="eligible">Elegíveis ({eligible.length})</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterEnterprise} onValueChange={setFilterEnterprise}>
            <SelectTrigger className="w-[220px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os empreendimentos</SelectItem>
              {enterprises.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ═══ Overview Tab ═══ */}
        <TabsContent value="overview">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Empreendimento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Situação</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Último Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ov) => {
                    const client = getClientForOverview(ov);
                    const enterprise = enterprises.find((e) => e.id === client?.identerprise);
                    return (
                      <tr key={ov.id ?? ov.idclient} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{client?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{client?.unit}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{enterprise?.name}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ov.status} />
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <StatusBadge status={ov.situation} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <StatusBadge status={ov.status_recente} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" title="Overview" onClick={() => openOverview(ov)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Timeline" onClick={() => { if (ov.idclient) openTimeline(ov.idclient); }}>
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => { if (client) openEditClient(client); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" title="Excluir" onClick={() => { if (client) deleteClientMut.mutate(client.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Remanescentes Tab ═══ */}
        <TabsContent value="remanescentes">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Qualidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Entrega</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Obs</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {remanescentes.map((ov) => {
                    const client = getClientForOverview(ov);
                    return (
                      <tr key={ov.id ?? ov.idclient} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{client?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{client?.unit}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ov.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{ov.status_quality || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{ov.status_delivery || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{ov.obs || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" title="Editar Overview" onClick={() => openOverview(ov)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {remanescentes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum remanescente</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Eligible Tab ═══ */}
        <TabsContent value="eligible">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Empreendimento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((el) => (
                    <tr key={el.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{el.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{el.unit}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{el.nameenterprise}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${el.type === "new" ? "bg-success/10 text-success border-success/20" : "bg-info/10 text-info border-info/20"}`}>
                          {el.type === "new" ? "Novo" : "Reagendamento"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={el.status} />
                      </td>
                    </tr>
                  ))}
                  {eligible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente elegível</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Timeline Dialog ═══ */}
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Timeline — {clients.find((c) => c.id === selectedClient)?.name}</DialogTitle>
          </DialogHeader>
          {timelineEvents.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Carregando timeline...</span>
            </div>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
              {timelineEvents.map((evt, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-12 py-4">
                  <div className="absolute left-3 top-5 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs">
                    {eventIcons[evt.type] || "\uD83D\uDCCC"}
                  </div>
                  <p className="text-sm font-medium text-foreground">{evt.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(evt.date).toLocaleString("pt-BR")}</p>
                </motion.div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Overview Edit Dialog ═══ */}
      <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Overview — {editOverview && getClientForOverview(editOverview)?.name}</DialogTitle>
          </DialogHeader>
          {editOverview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={editOverview.status} onValueChange={(v) => setEditOverview({ ...editOverview, status: v as Overview["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDENTE">Pendente</SelectItem>
                      <SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem>
                      <SelectItem value="LIBERADA">Liberada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select value={editOverview.situation} onValueChange={(v) => setEditOverview({ ...editOverview, situation: v as Overview["situation"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status Qualidade</Label>
                  <Input value={editOverview.status_quality || ""} onChange={(e) => setEditOverview({ ...editOverview, status_quality: e.target.value || null })} placeholder="Ex: OK, PENDENTE" />
                </div>
                <div>
                  <Label>Status Entrega</Label>
                  <Input value={editOverview.status_delivery || ""} onChange={(e) => setEditOverview({ ...editOverview, status_delivery: e.target.value || null })} placeholder="Ex: OK, PENDENTE" />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={editOverview.obs || ""} onChange={(e) => setEditOverview({ ...editOverview, obs: e.target.value || null })} rows={3} placeholder="Observações gerais..." />
              </div>
              <Button onClick={handleSaveOverview} className="w-full" disabled={updateOverviewMut.isPending}>
                {updateOverviewMut.isPending ? "Salvando..." : "Salvar Overview"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Client Dialog ═══ */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={editingClient.unit} onChange={(e) => setEditingClient({ ...editingClient, unit: e.target.value })} />
              </div>
              <div>
                <Label>Vendedor</Label>
                <Input value={editingClient.seller} onChange={(e) => setEditingClient({ ...editingClient, seller: e.target.value })} />
              </div>
              <div>
                <Label>Empreendimento</Label>
                <Select value={String(editingClient.identerprise)} onValueChange={(v) => setEditingClient({ ...editingClient, identerprise: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {enterprises.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleEditClient} disabled={updateClientMut.isPending}>
                {updateClientMut.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
