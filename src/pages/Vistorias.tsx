import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarDays, List, Plus, Search, Loader2, Building2, Clock, Trash2, Edit2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown, Check, X,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Inspection, CreateInspectionDto, UpdateInspectionDto, EligibleClient, Client } from "@/types/api";

/* ═══ Helpers ═══ */
const statusColors: Record<string, string> = {
  ACEITE: "bg-success/10 text-success border-success/20",
  AGUARDANDO: "bg-warning/10 text-warning border-warning/20",
  RECUSA: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELADA: "bg-muted text-muted-foreground border-border",
};
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const STATUS_ORDER = ["AGUARDANDO", "ACEITE", "RECUSA", "CANCELADA"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const formatDateBR = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const toBrazilIso = (date: string, time: string) => `${date}T${time}:00-03:00`;

type SortField = "datetime" | "client" | "inspector" | "status" | "mobuss";
type SortDir = "asc" | "desc";

const Vistorias = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* ═══ Queries ═══ */
  const { data: inspections = [], isLoading } = useQuery({ queryKey: ["inspections"], queryFn: () => api.inspections.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => api.clients.list() });
  const { data: enterprises = [] } = useQuery({ queryKey: ["enterprises"], queryFn: () => api.enterprises.list() });
  const { data: eligible = [] } = useQuery({ queryKey: ["eligible"], queryFn: () => api.eligible.list() });
  const { data: rejections = [] } = useQuery({ queryKey: ["rejections"], queryFn: () => api.rejections.list() });

  /* ═══ State ═══ */
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [search, setSearch] = useState("");
  const [filterEnterprise, setFilterEnterprise] = useState("all");
  const [entOpen, setEntOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("datetime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [aptosTab, setAptosTab] = useState<"new" | "again">("new");
  const [aptosSearch, setAptosSearch] = useState("");
  const [selectedEligible, setSelectedEligible] = useState<EligibleClient | null>(null);
  const [newInspDate, setNewInspDate] = useState("");
  const [newInspTime, setNewInspTime] = useState("09:00");
  const [newInspInspector, setNewInspInspector] = useState("");
  const [newInspObs, setNewInspObs] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editInsp, setEditInsp] = useState<Inspection | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [editInspector, setEditInspector] = useState("");
  const [editObs, setEditObs] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMobuss, setEditMobuss] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Table pagination
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);

  // Month/Year picker
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  /* ═══ Mutations ═══ */
  const createMut = useMutation({
    mutationFn: (data: CreateInspectionDto) => api.inspections.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inspections"] }); queryClient.invalidateQueries({ queryKey: ["eligible"] }); setAddOpen(false); setSelectedEligible(null); toast({ title: "Vistoria agendada!" }); },
    onError: (err: Error) => toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInspectionDto }) => api.inspections.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inspections"] }); setEditOpen(false); toast({ title: "Vistoria atualizada!" }); },
    onError: (err: Error) => toast({ title: "Erro ao atualizar vistoria", description: err.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.inspections.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inspections"] }); queryClient.invalidateQueries({ queryKey: ["eligible"] }); setDeleteConfirmOpen(false); toast({ title: "Vistoria removida" }); },
    onError: (err: Error) => toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });
  const inlineUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInspectionDto }) => api.inspections.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inspections"] }); },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });

  /* ═══ Computed ═══ */
  const getClient = (idclient: number) => clients.find((c) => c.id === idclient);
  const getEnterprise = (identerprise?: number) => enterprises.find((e) => e.id === identerprise);

  const filtered = useMemo(() => {
    return inspections.filter((ins) => {
      const client = getClient(ins.idclient);
      if (!client) return true;
      const matchSearch = !search || client.name.toLowerCase().includes(search.toLowerCase()) || client.unit.toLowerCase().includes(search.toLowerCase());
      const matchEnt = filterEnterprise === "all" || String(client.identerprise) === filterEnterprise;
      return matchSearch && matchEnt;
    });
  }, [inspections, clients, search, filterEnterprise]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "datetime": return dir * (new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        case "client": {
          const ca = getClient(a.idclient)?.name || "";
          const cb = getClient(b.idclient)?.name || "";
          return dir * ca.localeCompare(cb);
        }
        case "inspector": return dir * ((a.inspector || "").localeCompare(b.inspector || ""));
        case "status": return dir * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
        case "mobuss": return dir * (Number(a.mobuss) - Number(b.mobuss));
        default: return 0;
      }
    });
  }, [filtered, sortField, sortDir, clients]);

  // Grouped by status for table
  const grouped = useMemo(() => {
    const groups: Record<string, typeof sorted> = {};
    for (const s of STATUS_ORDER) groups[s] = [];
    for (const ins of sorted) {
      const s = STATUS_ORDER.includes(ins.status) ? ins.status : "AGUARDANDO";
      groups[s].push(ins);
    }
    return groups;
  }, [sorted]);

  // Calendar data
  const calInspections = useMemo(() => {
    const map = new Map<string, typeof inspections>();
    for (const ins of filtered) {
      const d = new Date(ins.datetime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ins);
    }
    return map;
  }, [filtered]);

  const selectedDayInspections = useMemo(() => {
    if (!selectedDay) return [];
    return filtered.filter((ins) => isSameDay(new Date(ins.datetime), selectedDay)).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [filtered, selectedDay]);

  // Eligible filtered
  const eligibleByEnterprise = useMemo(() => {
    return eligible.filter((e) => filterEnterprise === "all" || String(e.identerprise) === filterEnterprise);
  }, [eligible, filterEnterprise]);

  const filteredEligible = useMemo(() => {
    return eligibleByEnterprise
      .filter((e) => e.type === aptosTab)
      .filter((e) => !aptosSearch || e.name.toLowerCase().includes(aptosSearch.toLowerCase()) || e.unit.toLowerCase().includes(aptosSearch.toLowerCase()));
  }, [eligibleByEnterprise, aptosTab, aptosSearch]);

  const selectedEntName = filterEnterprise === "all" ? "Todos" : enterprises.find((e) => String(e.id) === filterEnterprise)?.name || "";

  /* ═══ Handlers ═══ */
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const openEdit = (ins: Inspection) => {
    setEditInsp(ins);
    const dt = new Date(ins.datetime);
    setEditDate(ins.datetime.split("T")[0]);
    setEditTime(`${String(dt.getHours()).padStart(2, "0")}:${dt.getMinutes() < 30 ? "00" : "30"}`);
    setEditInspector(ins.inspector || "");
    setEditObs(ins.obs || "");
    setEditStatus(ins.status);
    setEditMobuss(ins.mobuss);
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!selectedEligible || !newInspDate) { toast({ title: "Selecione o cliente e a data", variant: "destructive" }); return; }
    const dto: CreateInspectionDto = {
      idclient: selectedEligible.id,
      datetime: toBrazilIso(newInspDate, newInspTime),
      inspector: newInspInspector || undefined,
      obs: newInspObs || undefined,
      idprerejection: selectedEligible.idrejection || undefined,
    };
    createMut.mutate(dto);
  };

  const handleSaveEdit = () => {
    if (!editInsp) return;
    updateMut.mutate({
      id: editInsp.id,
      data: { datetime: toBrazilIso(editDate, editTime), inspector: editInspector || undefined, obs: editObs || undefined, status: editStatus, mobuss: editMobuss },
    });
  };

  const confirmDelete = (id: number) => { setDeletingId(id); setDeleteConfirmOpen(true); };
  const executeDelete = () => { if (deletingId) deleteMut.mutate(deletingId); };

  const toggleGroup = (status: string) => setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));

  /* ═══ Sort header helper ═══ */
  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase hover:text-foreground transition-colors" onClick={() => toggleSort(field)}>
      {label}
      {sortField === field ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );

  /* ═══ Previous rejection date helper ═══ */
  const getPrevRejectionDate = (ins: Inspection) => {
    if (!ins.idprerejection) return null;
    const rej = rejections.find((r) => r.id === ins.idprerejection);
    return rej?.created_at || null;
  };

  /* ═══ Calendar Grid ═══ */
  const renderCalendar = () => {
    const dim = daysInMonth(calYear, calMonth);
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const cells: React.ReactNode[] = [];
    // Blank leading cells
    for (let i = 0; i < firstDow; i++) cells.push(<div key={`b${i}`} className="h-20 bg-muted/20 rounded-md" />);
    for (let d = 1; d <= dim; d++) {
      const date = new Date(calYear, calMonth, d);
      const key = `${calYear}-${calMonth}-${d}`;
      const dayInsp = calInspections.get(key) || [];
      const isToday = isSameDay(date, today);
      const isSelected = selectedDay && isSameDay(date, selectedDay);
      cells.push(
        <div
          key={key}
          className={`h-20 rounded-md border p-1 cursor-pointer transition-colors relative
            ${isToday ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}
            ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
          onClick={() => setSelectedDay(date)}
        >
          <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{d}</span>
          {dayInsp.length > 0 && (
            <div className="mt-0.5 space-y-0.5 overflow-hidden">
              {dayInsp.slice(0, 2).map((ins) => {
                const cl = getClient(ins.idclient);
                return <div key={ins.id} className={`text-[9px] leading-tight truncate px-1 py-0.5 rounded ${statusColors[ins.status] || "bg-muted"}`}>{cl?.name?.split(" ")[0] || "?"} {new Date(ins.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>;
              })}
              {dayInsp.length > 2 && <div className="text-[9px] text-muted-foreground px-1">+{dayInsp.length - 2} mais</div>}
            </div>
          )}
        </div>,
      );
    }
    return cells;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="ml-3 text-muted-foreground">Carregando vistorias...</span></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vistorias</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} vistorias</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setViewMode("calendar")}><CalendarDays className="w-4 h-4 mr-1" /> Calendário</Button>
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setViewMode("table")}><List className="w-4 h-4 mr-1" /> Tabela</Button>
          </div>

          {/* Add inspection */}
          <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setSelectedEligible(null); setAptosSearch(""); } }}>
            <PopoverTrigger asChild><Button size="sm" className="relative"><Plus className="w-4 h-4 mr-2" /> Agendar
              {eligibleByEnterprise.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{eligibleByEnterprise.length}</span>
              )}
            </Button></PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-semibold">Selecionar cliente apto</h4>
              </div>
              <Tabs value={aptosTab} onValueChange={(v) => setAptosTab(v as "new" | "again")} className="px-3 pt-2">
                <TabsList className="h-8 bg-muted/50 w-full">
                  <TabsTrigger value="new" className="text-xs flex-1">Novos ({eligibleByEnterprise.filter((e) => e.type === "new").length})</TabsTrigger>
                  <TabsTrigger value="again" className="text-xs flex-1">Reagendamento ({eligibleByEnterprise.filter((e) => e.type === "again").length})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="px-3 py-2">
                <Input placeholder="Buscar cliente..." value={aptosSearch} onChange={(e) => setAptosSearch(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="max-h-[200px] overflow-y-auto border-t border-border">
                {filteredEligible.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Nenhum cliente apto</p>}
                {filteredEligible.map((el) => (
                  <button key={el.id} className={`w-full text-left px-3 py-1.5 hover:bg-muted/50 transition-colors flex items-center justify-between text-sm ${selectedEligible?.id === el.id ? "bg-primary/10" : ""}`} onClick={() => setSelectedEligible(el)}>
                    <div>
                      <p className="font-medium text-foreground leading-tight">{el.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{el.unit} — {el.nameenterprise}</p>
                    </div>
                    {selectedEligible?.id === el.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
              {selectedEligible && (
                <div className="p-3 border-t border-border space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1"><Label className="text-xs">Data</Label><Input type="date" className="h-8 text-sm" value={newInspDate} onChange={(e) => setNewInspDate(e.target.value)} /></div>
                    <div className="w-[100px]"><Label className="text-xs">Hora</Label>
                      <Select value={newInspTime} onValueChange={setNewInspTime}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent className="max-h-[200px]">{TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                    </div>
                  </div>
                  <div><Label className="text-xs">Vistoriador</Label><Input className="h-8 text-sm" placeholder="Nome" value={newInspInspector} onChange={(e) => setNewInspInspector(e.target.value)} /></div>
                  <div><Label className="text-xs">Observações</Label><Textarea rows={2} className="text-sm" value={newInspObs} onChange={(e) => setNewInspObs(e.target.value)} /></div>
                  <Button className="w-full" size="sm" onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "Agendando..." : "Agendar Vistoria"}</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
        </div>
        <Popover open={entOpen} onOpenChange={setEntOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[200px] justify-start h-8 text-sm font-normal">
              <Building2 className="w-3.5 h-3.5 mr-2 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{selectedEntName}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command><CommandInput placeholder="Buscar..." /><CommandList><CommandEmpty>Nenhum</CommandEmpty><CommandGroup>
              <CommandItem value="__all__" onSelect={() => { setFilterEnterprise("all"); setEntOpen(false); }}>Todos</CommandItem>
              {enterprises.map((e) => <CommandItem key={e.id} value={e.name} onSelect={() => { setFilterEnterprise(String(e.id)); setEntOpen(false); }}>{e.name}</CommandItem>)}
            </CommandGroup></CommandList></Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* ═══ CALENDAR VIEW ═══ */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}><ChevronLeft className="w-4 h-4" /></Button>
            <Popover open={monthPickerOpen} onOpenChange={(open) => { setMonthPickerOpen(open); if (open) setPickerYear(calYear); }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="text-lg font-semibold capitalize h-9 px-3 gap-1">
                  {new Date(calYear, calMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-3" align="center">
                {/* Year selector */}
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(pickerYear - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-sm font-semibold">{pickerYear}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(pickerYear + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 12 }, (_, i) => {
                    const label = new Date(pickerYear, i).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
                    const isActive = pickerYear === calYear && i === calMonth;
                    return (
                      <Button key={i} variant={isActive ? "default" : "ghost"} size="sm" className="h-8 text-xs capitalize" onClick={() => { setCalYear(pickerYear); setCalMonth(i); setMonthPickerOpen(false); }}>
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}><ChevronRight className="w-4 h-4" /></Button>
          </div>

          {/* Calendar grid */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
          </div>

          {/* Selected day details */}
          {selectedDay && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h4 className="text-sm font-semibold mb-3">{selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} — {selectedDayInspections.length} vistorias</h4>
              {selectedDayInspections.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma vistoria nesta data</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayInspections.map((ins) => {
                    const cl = getClient(ins.idclient);
                    const ent = getEnterprise(cl?.identerprise);
                    return (
                      <div key={ins.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground">{new Date(ins.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          <div>
                            <p className="text-sm font-medium leading-tight">{cl?.name}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{cl?.unit}{ent ? ` — ${ent.name}` : ""}</p>
                          </div>
                          <StatusBadge status={ins.status} />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ins)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => confirmDelete(ins.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === "table" && (
        <div className="space-y-3">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status] || [];
            if (items.length === 0) return null;
            const collapsed = !!collapsedGroups[status];
            const totalItems = items.length;
            const paginatedItems = items.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);
            const groupTotalPages = Math.max(1, Math.ceil(totalItems / tablePageSize));
            return (
              <div key={status} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Group header */}
                <button className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors" onClick={() => toggleGroup(status)}>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">{items.length} vistorias</span>
                  </div>
                  {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {!collapsed && (
                  <>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed min-w-[980px]">
                      <colgroup>
                        <col className="w-[170px]" />
                        <col className="w-[240px]" />
                        <col className="w-[170px]" />
                        <col className="w-[190px]" />
                        <col className="w-[110px]" />
                        <col className="w-[100px]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2"><SortHeader field="datetime" label="Data/Hora" /></th>
                          <th className="text-left px-3 py-2"><SortHeader field="client" label="Cliente" /></th>
                          <th className="text-left px-3 py-2 hidden md:table-cell"><SortHeader field="inspector" label="Vistoriador" /></th>
                          <th className="text-left px-3 py-2"><SortHeader field="status" label="Status" /></th>
                          <th className="text-left px-3 py-2"><SortHeader field="mobuss" label="Mobuss" /></th>
                          <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[80px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((ins) => {
                          const cl = getClient(ins.idclient);
                          const ent = getEnterprise(cl?.identerprise);
                          return (
                            <tr key={ins.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 text-sm">{new Date(ins.datetime).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                              <td className="px-3 py-1.5">
                                <p className="text-sm font-medium leading-tight">{cl?.name}</p>
                                <p className="text-[11px] text-muted-foreground leading-tight">{cl?.unit}</p>
                              </td>
                              <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell truncate">{ins.inspector || "—"}</td>
                              <td className="px-3 py-1.5">
                                {/* Inline editable status */}
                                <Select value={ins.status} onValueChange={(v) => inlineUpdateMut.mutate({ id: ins.id, data: { status: v } })}>
                                  <SelectTrigger className={`h-7 w-[130px] text-xs border ${statusColors[ins.status] || "bg-muted text-muted-foreground border-border"}`}><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                                    <SelectItem value="ACEITE">Aceite</SelectItem>
                                    <SelectItem value="RECUSA">Recusa</SelectItem>
                                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-1.5">
                                {/* Inline editable mobuss */}
                                <Switch checked={ins.mobuss} onCheckedChange={(v) => inlineUpdateMut.mutate({ id: ins.id, data: { mobuss: v } })} />
                              </td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ins)}><Edit2 className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => confirmDelete(ins.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalItems > tablePageSize && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
                      <span className="text-xs text-muted-foreground">{((tablePage - 1) * tablePageSize) + 1}–{Math.min(tablePage * tablePageSize, totalItems)} de {totalItems}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={tablePage <= 1} onClick={() => setTablePage(tablePage - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="text-xs text-muted-foreground">{tablePage}/{groupTotalPages}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={tablePage >= groupTotalPages} onClick={() => setTablePage(tablePage + 1)}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma vistoria encontrada</div>}
        </div>
      )}

      {/* ═══ Edit Dialog ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Vistoria</DialogTitle></DialogHeader>
          {editInsp && (() => {
            const cl = getClient(editInsp.idclient);
            const prevRejDate = getPrevRejectionDate(editInsp);
            return (
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <p className="text-sm font-medium">{cl?.name}</p>
                  <p className="text-xs text-muted-foreground">{cl?.unit}</p>
                </div>
                {prevRejDate && (
                  <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-xs text-warning font-medium">Recusa anterior: {formatDateBR(prevRejDate)}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-8 text-sm bg-card border-input shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                        <SelectItem value="ACEITE">Aceite</SelectItem>
                        <SelectItem value="RECUSA">Recusa</SelectItem>
                        <SelectItem value="CANCELADA">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Mobuss</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Switch checked={editMobuss} onCheckedChange={setEditMobuss} />
                      <span className="text-sm text-muted-foreground">{editMobuss ? "Sim" : "Não"}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Data</Label><Input type="date" className="h-8 text-sm bg-card border-input shadow-sm" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></div>
                  <div><Label className="text-xs">Hora</Label>
                    <Select value={editTime} onValueChange={setEditTime}><SelectTrigger className="h-8 text-sm bg-card border-input shadow-sm"><SelectValue /></SelectTrigger><SelectContent className="max-h-[200px]">{TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <div><Label className="text-xs">Vistoriador</Label><Input className="h-8 text-sm bg-card border-input shadow-sm" value={editInspector} onChange={(e) => setEditInspector(e.target.value)} /></div>
                <div><Label className="text-xs">Observações</Label><Textarea rows={2} className="text-sm bg-card border-input shadow-sm" value={editObs} onChange={(e) => setEditObs(e.target.value)} /></div>
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={handleSaveEdit} disabled={updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta vistoria? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vistorias;
