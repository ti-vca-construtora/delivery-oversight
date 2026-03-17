import { useState, useMemo, useRef, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Upload, Trash2, Clock, Eye, FileSpreadsheet, Loader2, Building2, ChevronLeft, ChevronRight, Edit2, X, ArrowUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Client, Overview, CreateClientDto, UpdateOverviewDto, TimelineEvent } from "@/types/api";

/* ─── Status badge (compact) ─── */
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
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const eventIcons: Record<string, string> = {
  CLIENT_CREATED: "🏷️", UNIT_RELEASED: "🔓", INSPECTION_SCHEDULED: "📅",
  INSPECTION_APPROVED: "✅", INSPECTION_REJECTED: "❌", REJECTION_RESOLVED: "🔄",
};

/* ─── Helpers ─── */
const formatDateBR = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
};

const PAGE_SIZES = [10, 20, 50];

const Clientes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* ═══ Queries ═══ */
  const { data: clients = [], isLoading: loadingClients } = useQuery({ queryKey: ["clients"], queryFn: () => api.clients.list() });
  const { data: overviews = [], isLoading: loadingOverviews } = useQuery({ queryKey: ["overviews"], queryFn: () => api.overview.list() });
  const { data: enterprises = [] } = useQuery({ queryKey: ["enterprises"], queryFn: () => api.enterprises.list() });
  const { data: eligible = [] } = useQuery({ queryKey: ["eligible"], queryFn: () => api.eligible.list() });
  const { data: inspections = [] } = useQuery({ queryKey: ["inspections"], queryFn: () => api.inspections.list() });

  /* ═══ State ═══ */
  const [search, setSearch] = useState("");
  const [filterEnterprise, setFilterEnterprise] = useState<string>("all");
  const [entOpen, setEntOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<"name" | "unit" | "enterprise" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dialogs
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOverview, setDetailsOverview] = useState<Overview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New client form
  const [newClient, setNewClient] = useState<CreateClientDto>({ name: "", unit: "", seller: "", identerprise: 0 });
  const [newClientEntOpen, setNewClientEntOpen] = useState(false);

  /* ═══ Mutations ═══ */
  const createClientMut = useMutation({
    mutationFn: (data: CreateClientDto) => api.clients.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); queryClient.invalidateQueries({ queryKey: ["overviews"] }); setNewClient({ name: "", unit: "", seller: "", identerprise: 0 }); setNewClientOpen(false); toast({ title: "Cliente criado com sucesso!" }); },
    onError: (err: Error) => toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" }),
  });
  const updateClientMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => api.clients.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); queryClient.invalidateQueries({ queryKey: ["overviews"] }); toast({ title: "Cliente atualizado!" }); },
    onError: (err: Error) => toast({ title: "Erro ao atualizar cliente", description: err.message, variant: "destructive" }),
  });
  const deleteClientMut = useMutation({
    mutationFn: (id: number) => api.clients.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); queryClient.invalidateQueries({ queryKey: ["overviews"] }); setDetailsOpen(false); setDeleteConfirmOpen(false); toast({ title: "Cliente removido" }); },
    onError: (err: Error) => toast({ title: "Erro ao remover cliente", description: err.message, variant: "destructive" }),
  });
  const updateOverviewMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOverviewDto }) => api.overview.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      queryClient.invalidateQueries({ queryKey: ["eligible"] });
      setIsEditing(false);
      setDetailsOpen(false);
      toast({ title: "Dados atualizados!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });
  const importClientsMut = useMutation({
    mutationFn: (data: CreateClientDto[]) => api.clients.bulkCreate(data),
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["clients"] }); queryClient.invalidateQueries({ queryKey: ["overviews"] }); setImportOpen(false); toast({ title: `Importação concluída: ${result.inserted} inseridos, ${result.skipped} ignorados` }); },
    onError: (err: Error) => toast({ title: "Erro na importação", description: err.message, variant: "destructive" }),
  });

  /* ═══ Computed ═══ */
  const getClient = (ov: Overview) => ov.client || clients.find((c) => c.id === ov.idclient);
  const getEnterprise = (identerprise?: number) => enterprises.find((e) => e.id === identerprise);
  const getOverviewByClientId = (idclient: number) => overviews.find((o) => (o.idclient ?? o.client?.id) === idclient);

  const filterByEnterpriseAndSearch = (list: Overview[]) => {
    return list.filter((o) => {
      const client = getClient(o);
      if (!client) return false;
      const matchSearch = !search || client.name.toLowerCase().includes(search.toLowerCase()) || client.unit.toLowerCase().includes(search.toLowerCase());
      const matchEnterprise = filterEnterprise === "all" || String(client.identerprise) === filterEnterprise;
      return matchSearch && matchEnterprise;
    });
  };

  const allFiltered = useMemo(() => filterByEnterpriseAndSearch(overviews), [search, filterEnterprise, overviews, clients]);
  const pendentes = useMemo(() => filterByEnterpriseAndSearch(overviews.filter((o) => o.status === "PENDENTE")), [search, filterEnterprise, overviews, clients]);

  const filteredEligible = useMemo(() => {
    return eligible.filter((el) => {
      const matchSearch = !search || el.name.toLowerCase().includes(search.toLowerCase()) || el.unit.toLowerCase().includes(search.toLowerCase());
      const matchEnterprise = filterEnterprise === "all" || String(el.identerprise) === filterEnterprise;
      return matchSearch && matchEnterprise;
    });
  }, [search, filterEnterprise, eligible]);

  // Agendados = overviews NOT pendente, NOT eligible, that have at least one inspection
  const eligibleIds = useMemo(() => new Set(eligible.map((e) => e.id)), [eligible]);
  const agendados = useMemo(() => {
    return filterByEnterpriseAndSearch(overviews.filter((o) => {
      if (o.status === "PENDENTE") return false;
      const client = getClient(o);
      if (!client) return false;
      if (eligibleIds.has(client.id)) return false;
      const hasInspection = inspections.some((ins) => ins.idclient === client.id);
      return hasInspection;
    }));
  }, [search, filterEnterprise, overviews, clients, inspections, eligibleIds]);

  // Pagination
  const getTabData = () => {
    switch (activeTab) {
      case "pendentes": return pendentes;
      case "eligible": return []; // eligible uses its own, not overview
      case "agendados": return agendados;
      default: return allFiltered;
    }
  };
  const currentData = getTabData();
  const totalPages = Math.max(1, Math.ceil((activeTab === "eligible" ? filteredEligible.length : currentData.length) / pageSize));
  const paginatedOverviews = currentData.slice((page - 1) * pageSize, page * pageSize);
  const paginatedEligible = filteredEligible.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on tab/filter change
  const handleTabChange = (t: string) => { setActiveTab(t); setPage(1); };
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleEnterpriseChange = (v: string) => { setFilterEnterprise(v); setEntOpen(false); setPage(1); };

  const selectedEntName = filterEnterprise === "all" ? "Todos os empreendimentos" : enterprises.find((e) => String(e.id) === filterEnterprise)?.name || "";

  /* ═══ Handlers ═══ */
  const openDetails = (ov: Overview) => { setDetailsOverview({ ...ov }); setIsEditing(false); setDetailsOpen(true); };

  const toggleSort = (field: "name" | "unit" | "enterprise" | "status") => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const sortOverviews = (list: Overview[]) => {
    return [...list].sort((a, b) => {
      const clientA = getClient(a);
      const clientB = getClient(b);
      let va = "", vb = "";
      if (sortField === "name") { va = clientA?.name || ""; vb = clientB?.name || ""; }
      else if (sortField === "unit") { va = clientA?.unit || ""; vb = clientB?.unit || ""; }
      else if (sortField === "enterprise") { va = getEnterprise(clientA?.identerprise)?.name || ""; vb = getEnterprise(clientB?.identerprise)?.name || ""; }
      else if (sortField === "status") { va = a.status; vb = b.status; }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  };
  const openTimeline = async (clientId: number) => {
    setSelectedClient(clientId); setTimelineEvents([]); setTimelineLoading(true); setTimelineOpen(true);
    try { const tl = await api.timeline.get(clientId); setTimelineEvents(tl.events); } catch { toast({ title: "Erro ao carregar timeline", variant: "destructive" }); }
    finally { setTimelineLoading(false); }
  };
  const confirmDelete = (id: number) => { setDeletingClientId(id); setDeleteConfirmOpen(true); };
  const executeDelete = () => { if (deletingClientId) deleteClientMut.mutate(deletingClientId); };

  const handleSaveDetails = () => {
    if (!detailsOverview?.id) return;
    updateOverviewMut.mutate({
      id: detailsOverview.id,
      data: {
        status: detailsOverview.status,
        situation: detailsOverview.situation,
        status_quality: detailsOverview.status_quality || undefined,
        status_construction: detailsOverview.status_construction || undefined,
        status_delivery: detailsOverview.status_delivery || undefined,
        data_register: detailsOverview.data_register ?? null,
        data_contact: detailsOverview.data_contact || undefined,
        obs: detailsOverview.obs || undefined,
      },
    });
  };

  const handleSaveClient = () => {
    if (!detailsOverview) return;
    const client = getClient(detailsOverview);
    if (!client) return;
    updateClientMut.mutate({ id: client.id, data: { name: client.name, unit: client.unit, seller: client.seller, identerprise: client.identerprise } });
  };

  const handleCreateClient = () => {
    if (!newClient.name || !newClient.unit || !newClient.seller || !newClient.identerprise) { toast({ title: "Preencha todos os campos", variant: "destructive" }); return; }
    createClientMut.mutate(newClient);
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast({ title: "Selecione um arquivo", variant: "destructive" }); return; }
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const mapped: CreateClientDto[] = rows.map((r) => ({
        name: r.nome || r.name || "",
        unit: r.unidade || r.unit || "",
        seller: r.corretor || r.seller || "",
        identerprise: Number(r.id_empreendimento || r.identerprise || 0),
      }));
      importClientsMut.mutate(mapped);
    } catch { toast({ title: "Erro ao ler arquivo", variant: "destructive" }); }
  };

  /* ═══ Render Helpers ═══ */
  const PaginationBar = ({ total }: { total: number }) => (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Linhas por página:</span>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="h-7 w-[60px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <span>{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
          return <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(p)}>{p}</Button>;
        })}
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );

  const SortTh = ({ field, label, className }: { field: "name" | "unit" | "enterprise" | "status"; label: string; className?: string }) => (
    <th className={`text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase cursor-pointer select-none whitespace-nowrap ${className || ""}`} onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-foreground" : "opacity-40"}`} /></span>
    </th>
  );

  const OverviewTable = ({ data, total }: { data: Overview[]; total: number }) => {
    const sorted = sortOverviews(data);

    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <SortTh field="name" label="Cliente" className="sticky left-0 bg-muted/50 z-10 min-w-[160px]" />
                <SortTh field="enterprise" label="Empreendimento" className="hidden md:table-cell" />
                <SortTh field="status" label="Status" />
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ov) => {
                const client = getClient(ov);
                const ent = getEnterprise(client?.identerprise);
                return (
                  <tr key={ov.id ?? ov.idclient} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-1.5 sticky left-0 bg-card z-10 min-w-[160px]">
                        <p className="text-sm font-medium text-foreground leading-tight">{client?.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{client?.unit}</p>
                      </td>
                      <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">{ent?.name}</td>
                      <td className="px-3 py-1.5">
                        <Select value={ov.status} onValueChange={(v) => { if (ov.id) updateOverviewMut.mutate({ id: ov.id, data: { status: v as Overview["status"] } }); }}>
                          <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-[11px] font-medium">
                            <SelectValue><StatusBadge status={ov.status} /></SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDENTE">Pendente</SelectItem>
                            <SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem>
                            <SelectItem value="LIBERADA">Liberada</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openDetails(ov)}><Eye className="w-3.5 h-3.5" /> Ver detalhes</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Timeline" onClick={() => { if (ov.idclient) openTimeline(ov.idclient); }}><Clock className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
        {total > 0 && <PaginationBar total={total} />}
      </div>
    );
  };

  if (loadingClients || loadingOverviews) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="ml-3 text-muted-foreground">Carregando clientes...</span></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral de Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro, visão geral e linha do tempo</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Importar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Importar Clientes (XLSX/CSV)</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1"><FileSpreadsheet className="w-4 h-4 text-primary" /><span className="text-sm font-medium">Formato esperado</span></div>
                  <p className="text-xs text-muted-foreground">Colunas: <strong>nome</strong>, <strong>unidade</strong>, <strong>corretor</strong>, <strong>id_empreendimento</strong></p>
                </div>
                <Input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="cursor-pointer file:cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-sm file:font-medium hover:file:bg-primary/20 transition-colors" />
                <Button onClick={handleImport} className="w-full" disabled={importClientsMut.isPending}>{importClientsMut.isPending ? "Importando..." : "Importar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Cliente</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input placeholder="Nome do cliente" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} /></div>
                <div><Label>Unidade</Label><Input placeholder="Apto 101" value={newClient.unit} onChange={(e) => setNewClient({ ...newClient, unit: e.target.value })} /></div>
                <div><Label>Corretor</Label><Input placeholder="Nome do corretor" value={newClient.seller} onChange={(e) => setNewClient({ ...newClient, seller: e.target.value })} /></div>
                <div>
                  <Label>Empreendimento</Label>
                  <Popover open={newClientEntOpen} onOpenChange={setNewClientEntOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal h-9">
                        <Building2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        <span className="truncate">{newClient.identerprise ? enterprises.find((e) => e.id === newClient.identerprise)?.name || "Selecione" : "Selecione"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0"><Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Nenhum</CommandEmpty><CommandGroup>
                      {enterprises.map((e) => <CommandItem key={e.id} value={e.name} onSelect={() => { setNewClient({ ...newClient, identerprise: e.id }); setNewClientEntOpen(false); }}>{e.name}</CommandItem>)}
                    </CommandGroup></CommandList></Command></PopoverContent>
                  </Popover>
                </div>
                <Button className="w-full" onClick={handleCreateClient} disabled={createClientMut.isPending}>{createClientMut.isPending ? "Criando..." : "Criar Cliente"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Visão Geral ({allFiltered.length})</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="eligible">Elegíveis ({filteredEligible.length})</TabsTrigger>
          <TabsTrigger value="agendados">Agendados ({agendados.length})</TabsTrigger>
        </TabsList>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10 h-8 text-sm" />
          </div>
          <Popover open={entOpen} onOpenChange={setEntOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[220px] justify-start h-8 text-sm font-normal">
                <Building2 className="w-3.5 h-3.5 mr-2 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{selectedEntName}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command><CommandInput placeholder="Buscar empreendimento..." /><CommandList><CommandEmpty>Nenhum encontrado</CommandEmpty><CommandGroup>
                <CommandItem value="__all__" onSelect={() => handleEnterpriseChange("all")}>Todos os empreendimentos</CommandItem>
                {enterprises.map((e) => <CommandItem key={e.id} value={e.name} onSelect={() => handleEnterpriseChange(String(e.id))}>{e.name}</CommandItem>)}
              </CommandGroup></CommandList></Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Overview / Remanescentes / Concluídos tabs all use same table layout */}
        <TabsContent value="overview"><OverviewTable data={paginatedOverviews} total={allFiltered.length} /></TabsContent>
        <TabsContent value="pendentes"><OverviewTable data={paginatedOverviews} total={pendentes.length} /></TabsContent>
        <TabsContent value="agendados"><OverviewTable data={paginatedOverviews} total={agendados.length} /></TabsContent>

        {/* Eligible tab */}
        <TabsContent value="eligible">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Empreendimento</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[120px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEligible.map((el) => {
                    const ov = getOverviewByClientId(el.id);
                    return (
                      <tr key={el.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-1.5">
                          <p className="text-sm font-medium text-foreground leading-tight">{el.name}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">{el.unit}</p>
                        </td>
                        <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{el.nameenterprise}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none ${el.type === "new" ? "bg-success/10 text-success border-success/20" : "bg-info/10 text-info border-info/20"}`}>
                            {el.type === "new" ? "Novo" : "Reagendamento"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5"><StatusBadge status={el.status} /></td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              if (ov) openDetails(ov);
                              else toast({ title: "Overview não encontrado para este cliente", variant: "destructive" });
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver detalhes
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Timeline" onClick={() => openTimeline(el.id)}><Clock className="w-3.5 h-3.5" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedEligible.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum cliente elegível</td></tr>}
                </tbody>
              </table>
            </div>
            {filteredEligible.length > 0 && <PaginationBar total={filteredEligible.length} />}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Details Dialog ═══ */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg overflow-visible">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{detailsOverview && getClient(detailsOverview)?.name}</span>
              {detailsOverview?.id && <span className="text-sm font-normal text-muted-foreground">#{detailsOverview.id}</span>}
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" title={isEditing ? "Fechar edição" : "Editar"} onClick={() => setIsEditing((e) => !e)}>
                {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-3 text-destructive hover:text-destructive"
                title="Excluir cliente"
                onClick={() => {
                  const client = detailsOverview ? getClient(detailsOverview) : null;
                  if (client) confirmDelete(client.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {detailsOverview && (() => {
            const client = getClient(detailsOverview);
            const ent = getEnterprise(client?.identerprise);
            return (
              <div className="space-y-4 overflow-y-auto max-h-[70vh] px-1 pr-2">
                {/* Client info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Unidade</span><p className="font-medium">{client?.unit}</p></div>
                  <div><span className="text-muted-foreground text-xs">Empreendimento</span><p className="font-medium">{ent?.name}</p></div>
                  <div><span className="text-muted-foreground text-xs">Corretor</span><p className="font-medium">{client?.seller}</p></div>
                </div>
                <hr className="border-border" />
                {/* Overview fields — always visible, disabled when not editing */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Status</Label>
                      <Select value={detailsOverview.status} disabled={!isEditing} onValueChange={(v) => setDetailsOverview({ ...detailsOverview, status: v as Overview["status"] })}>
                        <SelectTrigger className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing}><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="PENDENTE">Pendente</SelectItem><SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem><SelectItem value="LIBERADA">Liberada</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Situação</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Switch
                          checked={detailsOverview.situation === "ATIVO"}
                          disabled={!isEditing}
                          onCheckedChange={(checked) => setDetailsOverview({ ...detailsOverview, situation: checked ? "ATIVO" : "INATIVO" })}
                        />
                        <span className={`text-sm font-medium ${detailsOverview.situation === "ATIVO" ? "text-success" : "text-muted-foreground"}`}>
                          {detailsOverview.situation}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Data Registro</Label><Input type="date" className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing} value={detailsOverview.data_register?.split("T")[0] || ""} onChange={(e) => setDetailsOverview({ ...detailsOverview, data_register: e.target.value || null })} /></div>
                    <div><Label className="text-xs">Data Contato</Label><Input type="date" className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing} value={detailsOverview.data_contact?.split("T")[0] || ""} onChange={(e) => setDetailsOverview({ ...detailsOverview, data_contact: e.target.value || null })} /></div>
                  </div>
                  <div><Label className="text-xs">Status Qualidade</Label><Input className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing} value={detailsOverview.status_quality || ""} onChange={(e) => setDetailsOverview({ ...detailsOverview, status_quality: e.target.value || null })} /></div>
                  <div><Label className="text-xs">Status Obra</Label><Input className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing} value={detailsOverview.status_construction || ""} onChange={(e) => setDetailsOverview({ ...detailsOverview, status_construction: e.target.value || null })} /></div>
                  <div><Label className="text-xs">Status Entrega</Label><Input className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing} value={detailsOverview.status_delivery || ""} onChange={(e) => setDetailsOverview({ ...detailsOverview, status_delivery: e.target.value || null })} /></div>
                  <div><Label className="text-xs">Observações</Label><Textarea rows={2} className={`text-sm ${isEditing ? 'bg-card border-input shadow-sm focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0' : ''}`} disabled={!isEditing} value={detailsOverview.obs || ""} onChange={(e) => setDetailsOverview({ ...detailsOverview, obs: e.target.value || null })} /></div>
                  {isEditing && (
                    <div className="flex gap-2 pt-1">
                      <Button className="flex-1" size="sm" onClick={handleSaveDetails} disabled={updateOverviewMut.isPending}>{updateOverviewMut.isPending ? "Salvando..." : "Salvar"}</Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ Timeline Dialog ═══ */}
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Timeline — {clients.find((c) => c.id === selectedClient)?.name}</DialogTitle></DialogHeader>
          {timelineLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" /><span className="text-sm text-muted-foreground">Carregando...</span></div>
          ) : timelineEvents.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum evento encontrado</p>
          ) : (
            <div className="space-y-0 relative max-h-[400px] overflow-y-auto">
              <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
              {[...timelineEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((evt, i) => {
                // Format dates in description: yyyy-mm-dd → dd/mm/yyyy
                const formattedDesc = evt.description.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_m, y, mo, d) => `${d}/${mo}/${y}`);
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-12 py-3">
                    <div className="absolute left-3 top-4 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs">{eventIcons[evt.type] || "📌"}</div>
                    <p className="text-sm font-medium text-foreground">{formattedDesc}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(evt.date).toLocaleString("pt-BR")}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita. Todas as vistorias e recusas vinculadas serão afetadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteClientMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;
