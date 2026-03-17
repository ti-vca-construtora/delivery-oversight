import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Eye, Edit2, X, Trash2, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Rejection, UpdateRejectionDto, Inspection, Client } from "@/types/api";

/* ═══ Helpers ═══ */
const statusColors: Record<string, string> = {
  AGUARDANDO: "bg-muted text-muted-foreground border-border",
  "CONCLUÍDO": "bg-success/10 text-success border-success/20",
};
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const constructionStatusColors: Record<string, string> = {
  PENDENTE: "bg-muted text-muted-foreground border-border",
  "EM ANDAMENTO": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "CONCLUÍDA": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "CONCLUÍDO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "CONCLUIDO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};
const ConstructionStatusBadge = ({ status }: { status: string }) => {
  const normalized = status.toUpperCase().trim();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none ${constructionStatusColors[normalized] || "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
};

const formatDateBR = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const PAGE_SIZES = [10, 20, 50];
const STATUSES = ["AGUARDANDO", "CONCLUÍDO"];
const STATUSES_OBRA = ["PENDENTE", "EM ANDAMENTO", "CONCLUÍDA"];

const Recusas = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* ═══ Queries ═══ */
  const { data: rejections = [], isLoading } = useQuery({ queryKey: ["rejections"], queryFn: () => api.rejections.list() });
  const { data: inspections = [] } = useQuery({ queryKey: ["inspections"], queryFn: () => api.inspections.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => api.clients.list() });
  const { data: enterprises = [] } = useQuery({ queryKey: ["enterprises"], queryFn: () => api.enterprises.list() });

  /* ═══ State ═══ */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("AGUARDANDO");
  const [filterEnterprise, setFilterEnterprise] = useState("all");
  const [entOpen, setEntOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRej, setSelectedRej] = useState<Rejection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editData, setEditData] = useState<UpdateRejectionDto>({});

  /* ═══ Mutations ═══ */
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRejectionDto }) => api.rejections.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rejections"] }); setIsEditing(false); setDetailsOpen(false); toast({ title: "Recusa atualizada!" }); },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.rejections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rejections"] });
      setDeleteConfirmOpen(false);
      setIsEditing(false);
      setDetailsOpen(false);
      setSelectedRej(null);
      toast({ title: "Recusa removida" });
    },
    onError: (err: Error) => toast({ title: "Erro ao excluir recusa", description: err.message, variant: "destructive" }),
  });

  /* ═══ Helpers ═══ */
  const getInspection = (idinspection: number) => inspections.find((i) => i.id === idinspection);
  const getClient = (idclient: number) => clients.find((c) => c.id === idclient);

  const getClientFromRej = (rej: Rejection) => {
    const insp = getInspection(rej.idinspection);
    return insp ? getClient(insp.idclient) : undefined;
  };

  const getInspDatetime = (rej: Rejection) => {
    const insp = getInspection(rej.idinspection);
    return insp?.datetime || null;
  };

  /* ═══ Computed ═══ */
  const filtered = useMemo(() => {
    return rejections.filter((r) => {
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const client = getClientFromRej(r);
      const matchSearch = !search || (client && (
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.unit.toLowerCase().includes(search.toLowerCase())
      ));
      const matchEnterprise = filterEnterprise === "all" || String(r.identerprise) === filterEnterprise;
      return matchStatus && matchSearch && matchEnterprise;
    });
  }, [rejections, inspections, clients, search, filterStatus, filterEnterprise]);

  const selectedEntName = filterEnterprise === "all" ? "Todos os empreendimentos" : enterprises.find((e) => String(e.id) === filterEnterprise)?.name || "";

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ═══ Handlers ═══ */
  const openDetails = (rej: Rejection) => {
    setSelectedRej(rej);
    setEditData({ prevision_date: rej.prevision_date || undefined, construction_status: rej.construction_status, status: rej.status, obs: rej.obs || undefined });
    setIsEditing(false);
    setDetailsOpen(true);
  };

  const handleSave = () => {
    if (!selectedRej) return;
    updateMut.mutate({ id: selectedRej.id, data: editData });
  };

  const handleDelete = () => {
    if (!selectedRej) return;
    deleteMut.mutate(selectedRej.id);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="ml-3 text-muted-foreground">Carregando recusas...</span></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recusas</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} recusas {filterStatus !== "all" ? `com status ${filterStatus}` : ""}</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 h-8 text-sm" />
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
              <CommandItem value="__all__" onSelect={() => { setFilterEnterprise("all"); setEntOpen(false); setPage(1); }}>Todos os empreendimentos</CommandItem>
              {enterprises.map((e) => <CommandItem key={e.id} value={e.name} onSelect={() => { setFilterEnterprise(String(e.id)); setEntOpen(false); setPage(1); }}>{e.name}</CommandItem>)}
            </CommandGroup></CommandList></Command>
          </PopoverContent>
        </Popover>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Empreendimento</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Data Vistoria</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Previsão Obra</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase hidden lg:table-cell">Status Obra</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((rej) => {
                const client = getClientFromRej(rej);
                const inspDate = getInspDatetime(rej);
                return (
                  <tr key={rej.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-1.5">
                      <p className="text-sm font-medium leading-tight">{client?.name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{client?.unit || ""}</p>
                    </td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{rej.nameenterprise || "—"}</td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{formatDateBR(inspDate)}</td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden md:table-cell">{formatDateBR(rej.prevision_date)}</td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground hidden lg:table-cell">{rej.construction_status ? <ConstructionStatusBadge status={rej.construction_status} /> : "—"}</td>
                    <td className="px-3 py-1.5"><StatusBadge status={rej.status} /></td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openDetails(rej)}><Eye className="w-3.5 h-3.5" /> Ver detalhes</Button>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma recusa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Linhas por página:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-[60px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <span>{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}</span>
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
        )}
      </div>

      {/* ═══ Details / Edit Dialog ═══ */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Detalhes da Recusa</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" title={isEditing ? "Fechar edição" : "Editar"} onClick={() => setIsEditing((e) => !e)}>
                {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-3 text-destructive hover:text-destructive"
                title="Excluir recusa"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedRej && (() => {
            const client = getClientFromRej(selectedRej);
            const inspDate = getInspDatetime(selectedRej);
            return (
              <div className="space-y-4">
                {/* Client info */}
                <div className="p-2 rounded-lg bg-muted/40 border border-border">
                  <p className="text-sm font-medium">{client?.name}</p>
                  <p className="text-xs text-muted-foreground">{client?.unit}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Data Vistoria</span><p>{formatDateBR(inspDate)}</p></div>
                  <div><span className="text-muted-foreground text-xs">Criada em</span><p>{formatDateBR(selectedRej.created_at)}</p></div>
                </div>

                {/* Always-visible fields — disabled when not editing */}
                <div className="space-y-3">
                  <div><Label className="text-xs">Status</Label>
                    <Select value={editData.status} disabled={!isEditing} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm' : ''}`} disabled={!isEditing}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Status Obra</Label>
                    <Select value={editData.construction_status || ""} disabled={!isEditing} onValueChange={(v) => setEditData({ ...editData, construction_status: v })}>
                      <SelectTrigger className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm' : ''}`} disabled={!isEditing}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{STATUSES_OBRA.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Previsão Data</Label><Input type="date" className={`h-8 text-sm ${isEditing ? 'bg-card border-input shadow-sm' : ''}`} disabled={!isEditing} value={editData.prevision_date?.split("T")[0] || ""} onChange={(e) => setEditData({ ...editData, prevision_date: e.target.value })} /></div>
                  <div><Label className="text-xs">Observações</Label><Textarea rows={3} className={`text-sm ${isEditing ? 'bg-card border-input shadow-sm' : ''}`} disabled={!isEditing} value={editData.obs || ""} onChange={(e) => setEditData({ ...editData, obs: e.target.value })} /></div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" onClick={handleSave} disabled={updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta recusa? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Recusas;
