import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Pencil, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ModuleLayout from "@/components/ModuleLayout";
import { mockRejections, mockInspections, mockClients } from "@/lib/mock-data";
import type { Rejection } from "@/types/api";

const statusColors: Record<string, string> = {
  AGUARDANDO: "bg-warning/10 text-warning border-warning/20",
  "CONCLUÍDO": "bg-success/10 text-success border-success/20",
  PENDENTE: "bg-warning/10 text-warning border-warning/20",
  "EM ANDAMENTO": "bg-info/10 text-info border-info/20",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const Recusas = () => {
  const [rejections] = useState(mockRejections);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingRejection, setEditingRejection] = useState<Rejection | null>(null);
  const { toast } = useToast();

  const concludedNotScheduled = rejections.filter(r => r.status === "CONCLUÍDO");

  const getInspectionClient = (idinspection: number) => {
    const ins = mockInspections.find(i => i.id === idinspection);
    const client = ins ? mockClients.find(c => c.id === ins.idclient) : null;
    return { inspection: ins, client };
  };

  return (
    <ModuleLayout title="Recusas">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rejections.length}</p>
                <p className="text-xs text-muted-foreground">Total de recusas</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{concludedNotScheduled.length}</p>
                <p className="text-xs text-muted-foreground">Concluídas (aptas a reagendar)</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rejections.filter(r => r.status === "AGUARDANDO").length}</p>
                <p className="text-xs text-muted-foreground">Aguardando resolução</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar recusa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Vistoria #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status Obra</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Previsão</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Obs</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
            </tr></thead>
            <tbody>
              {rejections.map(rej => {
                const { client, inspection } = getInspectionClient(rej.idinspection);
                return (
                  <tr key={rej.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-sm">#{rej.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{client?.name || "—"}<span className="text-muted-foreground text-xs ml-2">{client?.unit}</span></td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">#{rej.idinspection}</td>
                    <td className="px-4 py-3"><StatusBadge status={rej.construction_status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={rej.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {rej.prevision_date ? new Date(rej.prevision_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{rej.obs || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingRejection(rej); setEditOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Recusa #{editingRejection?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status da Obra</Label>
              <Select defaultValue={editingRejection?.construction_status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUÍDA">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue={editingRejection?.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                  <SelectItem value="CONCLUÍDO">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Previsão</Label><Input type="date" defaultValue={editingRejection?.prevision_date || ""} /></div>
            <div><Label>Observações</Label><Input defaultValue={editingRejection?.obs || ""} /></div>
            <Button className="w-full" onClick={() => { setEditOpen(false); toast({ title: "Recusa atualizada!" }); }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

export default Recusas;
