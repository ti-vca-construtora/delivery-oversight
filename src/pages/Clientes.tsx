import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Upload, Pencil, Trash2, Eye, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ModuleLayout from "@/components/ModuleLayout";
import { mockClients, mockOverviews, mockEnterprises, mockEligible } from "@/lib/mock-data";
import type { Client, Overview, CreateClientDto, EligibleClient, TimelineEvent } from "@/types/api";

const statusColors: Record<string, string> = {
  PENDENTE: "bg-warning/10 text-warning border-warning/20",
  "EM ANDAMENTO": "bg-info/10 text-info border-info/20",
  LIBERADA: "bg-success/10 text-success border-success/20",
  ACEITE: "bg-success/10 text-success border-success/20",
  AGUARDANDO: "bg-warning/10 text-warning border-warning/20",
  RECUSA: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELADA: "bg-muted text-muted-foreground border-border",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || "bg-muted text-muted-foreground border-border"}`}>
    {status}
  </span>
);

const mockTimeline: TimelineEvent[] = [
  { type: "CLIENT_CREATED", date: "2026-01-16T15:00:00Z", description: "Cliente cadastrado no sistema" },
  { type: "UNIT_RELEASED", date: "2026-02-10T10:00:00Z", description: "Unidade liberada para vistoria" },
  { type: "INSPECTION_SCHEDULED", date: "2026-02-20T10:00:00Z", description: "Vistoria agendada" },
  { type: "INSPECTION_APPROVED", date: "2026-02-25T15:00:00Z", description: "Vistoria aprovada" },
];

const eventIcons: Record<string, string> = {
  CLIENT_CREATED: "🏷️",
  UNIT_RELEASED: "🔓",
  INSPECTION_SCHEDULED: "📅",
  INSPECTION_APPROVED: "✅",
  INSPECTION_REJECTED: "❌",
  REJECTION_RESOLVED: "🔄",
};

const Clientes = () => {
  const [clients] = useState(mockClients);
  const [overviews] = useState(mockOverviews);
  const [eligible] = useState(mockEligible);
  const [search, setSearch] = useState("");
  const [filterEnterprise, setFilterEnterprise] = useState<string>("all");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return overviews.filter(o => {
      const client = clients.find(c => c.id === o.idclient);
      if (!client) return false;
      const matchSearch = client.name.toLowerCase().includes(search.toLowerCase()) || client.unit.toLowerCase().includes(search.toLowerCase());
      const matchEnterprise = filterEnterprise === "all" || String(client.identerprise) === filterEnterprise;
      return matchSearch && matchEnterprise;
    });
  }, [search, filterEnterprise, overviews, clients]);

  const remanescentes = overviews.filter(o => o.remanescente);

  const handleImport = () => {
    toast({ title: "Importação simulada", description: "Conecte a API para importação real de XLSX/CSV" });
    setImportOpen(false);
  };

  return (
    <ModuleLayout
      title="Visão Geral de Clientes"
      actions={
        <div className="flex items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Importar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Importar Clientes (XLSX/CSV)</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione um arquivo XLSX ou CSV com as colunas: nome, unidade, vendedor, id_empreendimento</p>
                <Input ref={fileInputRef} type="file" accept=".xlsx,.csv" />
                <Button onClick={handleImport} className="w-full">Importar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input placeholder="Nome do cliente" /></div>
                <div><Label>Unidade</Label><Input placeholder="Apto 101" /></div>
                <div><Label>Vendedor</Label><Input placeholder="Nome do vendedor" /></div>
                <div>
                  <Label>Empreendimento</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{mockEnterprises.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => { setNewClientOpen(false); toast({ title: "Cliente criado!" }); }}>Criar Cliente</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Visão Geral ({overviews.length})</TabsTrigger>
          <TabsTrigger value="remanescentes">Remanescentes ({remanescentes.length})</TabsTrigger>
          <TabsTrigger value="eligible">Elegíveis ({eligible.length})</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterEnterprise} onValueChange={setFilterEnterprise}>
            <SelectTrigger className="w-[220px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os empreendimentos</SelectItem>
              {mockEnterprises.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="overview">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Empreendimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Situação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Último Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                </tr></thead>
                <tbody>
                  {filtered.map(ov => {
                    const client = clients.find(c => c.id === ov.idclient);
                    const enterprise = mockEnterprises.find(e => e.id === client?.identerprise);
                    return (
                      <tr key={ov.idclient} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{client?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{client?.unit}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{enterprise?.name}</td>
                        <td className="px-4 py-3"><StatusBadge status={ov.status} /></td>
                        <td className="px-4 py-3"><StatusBadge status={ov.situation} /></td>
                        <td className="px-4 py-3"><StatusBadge status={ov.status_recente} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedClient(ov.idclient!); setTimelineOpen(true); }}><Clock className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="remanescentes">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Qualidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Entrega</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Obs</th>
              </tr></thead>
              <tbody>
                {remanescentes.map(ov => {
                  const client = clients.find(c => c.id === ov.idclient);
                  return (
                    <tr key={ov.idclient} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{client?.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{client?.unit}</td>
                      <td className="px-4 py-3"><StatusBadge status={ov.status} /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ov.status_quality || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ov.status_delivery || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ov.obs || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="eligible">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Empreendimento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr></thead>
              <tbody>
                {eligible.map(el => (
                  <tr key={el.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{el.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{el.unit}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{el.nameenterprise}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${el.type === "new" ? "bg-success/10 text-success border-success/20" : "bg-info/10 text-info border-info/20"}`}>
                        {el.type === "new" ? "Novo" : "Reagendamento"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={el.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Timeline Dialog */}
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Timeline — {clients.find(c => c.id === selectedClient)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-0 relative">
            <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
            {mockTimeline.map((evt, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-12 py-4">
                <div className="absolute left-3 top-5 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs">
                  {eventIcons[evt.type]}
                </div>
                <p className="text-sm font-medium text-foreground">{evt.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(evt.date).toLocaleString("pt-BR")}</p>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

export default Clientes;
