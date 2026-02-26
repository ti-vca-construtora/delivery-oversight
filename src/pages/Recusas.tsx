import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Pencil, Trash2, Loader2, AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Rejection, UpdateRejectionDto, EligibleClient } from "@/types/api";

const statusColors: Record<string, string> = {
  PENDENTE: "bg-warning/10 text-warning border-warning/20",
  RESOLVIDA: "bg-success/10 text-success border-success/20",
  CANCELADA: "bg-muted text-muted-foreground border-border",
};

const constructionStatusColors: Record<string, string> = {
  PENDENTE: "bg-warning/10 text-warning border-warning/20",
  "EM ANDAMENTO": "bg-info/10 text-info border-info/20",
  CONCLUIDA: "bg-success/10 text-success border-success/20",
};

const StatusBadge = ({ status, variant }: { status: string; variant?: "construction" }) => {
  const colors = variant === "construction" ? constructionStatusColors : statusColors;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
};

const Recusas = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Queries ───
  const { data: rejections = [], isLoading: loadingRejections } = useQuery({
    queryKey: ["rejections"],
    queryFn: () => api.rejections.list(),
  });
  const { data: inspections = [] } = useQuery({
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

  // ─── State ───
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterConstruction, setFilterConstruction] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editingRejection, setEditingRejection] = useState<Rejection | null>(null);
  const [editForm, setEditForm] = useState<UpdateRejectionDto>({});

  // ─── Mutations ───
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRejectionDto }) => api.rejections.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rejections"] });
      queryClient.invalidateQueries({ queryKey: ["eligible"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      setEditOpen(false);
      setEditingRejection(null);
      toast({ title: "Recusa atualizada!" });
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar recusa", description: err.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.rejections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rejections"] });
      queryClient.invalidateQueries({ queryKey: ["eligible"] });
      queryClient.invalidateQueries({ queryKey: ["overviews"] });
      toast({ title: "Recusa removida" });
    },
    onError: (err: Error) => toast({ title: "Erro ao remover recusa", description: err.message, variant: "destructive" }),
  });

  // ─── Computed ───
  const enriched = useMemo(() => {
    return rejections.map((rej) => {
      const inspection = inspections.find((i) => i.id === rej.idinspection);
      const client = inspection ? clients.find((c) => c.id === inspection.idclient) : undefined;
      return { ...rej, inspection, client };
    });
  }, [rejections, inspections, clients]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      const matchSearch = r.client?.name.toLowerCase().includes(search.toLowerCase()) || r.obs?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchConstruction = filterConstruction === "all" || r.construction_status === filterConstruction;
      return matchSearch && matchStatus && matchConstruction;
    });
  }, [enriched, search, filterStatus, filterConstruction]);

  // Summary counters
  const summary = useMemo(() => {
    const total = rejections.length;
    const pending = rejections.filter((r) => r.status === "PENDENTE").length;
    const resolved = rejections.filter((r) => r.status === "RESOLVIDA").length;
    const overdue = rejections.filter((r) => r.prevision_date && new Date(r.prevision_date) < new Date() && r.status === "PENDENTE").length;
    return { total, pending, resolved, overdue };
  }, [rejections]);

  const eligibleAgain: EligibleClient[] = useMemo(() => eligible.filter((e) => e.type === "again"), [eligible]);

  // ─── Handlers ───
  const openEdit = (rej: Rejection) => {
    setEditingRejection(rej);
    setEditForm({
      status: rej.status,
      construction_status: rej.construction_status,
      prevision_date: rej.prevision_date || "",
      obs: rej.obs || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingRejection) return;
    updateMut.mutate({ id: editingRejection.id, data: editForm });
  };

  if (loadingRejections) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando recusas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recusas</h1>
        <p className="text-sm text-muted-foreground">Gestão de recusas de vistoria e acompanhamento de obras</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: summary.total, color: "text-foreground" },
          { label: "Pendentes", value: summary.pending, color: "text-warning" },
          { label: "Resolvidas", value: summary.resolved, color: "text-success" },
          { label: "Atrasadas", value: summary.overdue, color: "text-destructive" },
        ].map((card) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Eligible again alert */}
      {eligibleAgain.length > 0 && (
        <Alert variant="default" className="border-info/30 bg-info/5">
          <CalendarClock className="w-4 h-4 text-info" />
          <AlertTitle className="text-info">Clientes aptos para reagendamento</AlertTitle>
          <AlertDescription className="text-sm">
            {eligibleAgain.length} cliente(s) com obra concluída podem ser reagendados.
            Acesse a página <span className="font-semibold">Vistorias</span> → <span className="font-semibold">Aptos</span> para agendar.
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou observação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="RESOLVIDA">Resolvida</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterConstruction} onValueChange={setFilterConstruction}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status Obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Obras</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="CONCLUIDA">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Data Vistoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Previsão Obra</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status Obra</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Obs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rej) => {
                const isOverdue = rej.prevision_date && new Date(rej.prevision_date) < new Date() && rej.status === "PENDENTE";
                return (
                  <tr key={rej.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${isOverdue ? "bg-destructive/5" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{rej.client?.name || "—"}</span>
                      <span className="text-muted-foreground text-xs ml-2">{rej.client?.unit}</span>
                      {isOverdue && <AlertTriangle className="inline-block ml-2 w-4 h-4 text-destructive" />}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {rej.inspection ? new Date(rej.inspection.datetime).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {rej.prevision_date ? new Date(rej.prevision_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rej.construction_status} variant="construction" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rej.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate hidden lg:table-cell">{rej.obs || "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rej)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => deleteMut.mutate(rej.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma recusa encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Recusa #{editingRejection?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status || ""} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="RESOLVIDA">Resolvida</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status da Obra</Label>
              <Select value={editForm.construction_status || ""} onValueChange={(v) => setEditForm({ ...editForm, construction_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Previsão de Conclusão</Label>
              <Input type="date" value={editForm.prevision_date || ""} onChange={(e) => setEditForm({ ...editForm, prevision_date: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={editForm.obs || ""} onChange={(e) => setEditForm({ ...editForm, obs: e.target.value })} placeholder="Observações sobre a recusa/obra" />
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

export default Recusas;
