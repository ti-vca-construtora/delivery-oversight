import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, List, CalendarDays, Users2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import ModuleLayout from "@/components/ModuleLayout";
import { mockInspections, mockClients, mockEnterprises, mockEligible } from "@/lib/mock-data";
import type { Inspection, EligibleClient } from "@/types/api";

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
  const [inspections] = useState(mockInspections);
  const [eligible] = useState(mockEligible);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [eligibleOpen, setEligibleOpen] = useState(false);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return inspections.filter(ins => {
      const client = mockClients.find(c => c.id === ins.idclient);
      return client?.name.toLowerCase().includes(search.toLowerCase()) || ins.inspector?.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, inspections]);

  // Calendar: group by date
  const calendarDays = useMemo(() => {
    const days: Record<string, Inspection[]> = {};
    filtered.forEach(ins => {
      const day = ins.datetime.split("T")[0];
      if (!days[day]) days[day] = [];
      days[day].push(ins);
    });
    return Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const eligibleAgain = eligible.filter(e => e.type === "again");

  return (
    <ModuleLayout
      title="Vistorias"
      actions={
        <div className="flex items-center gap-2">
          {/* Eligible badge */}
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
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold text-sm text-foreground">Clientes aptos para agendar</h4>
                <p className="text-xs text-muted-foreground">{eligible.length} cliente(s) disponível(is)</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {eligible.map(el => (
                  <button
                    key={el.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                    onClick={() => { setEligibleOpen(false); setNewOpen(true); toast({ title: `Agendando para ${el.name}` }); }}
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
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nova Vistoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Vistoria</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cliente</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>{mockClients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.unit}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data e Hora</Label><Input type="datetime-local" /></div>
                <div><Label>Vistoriador</Label><Input placeholder="Nome do vistoriador" /></div>
                <div><Label>Observações</Label><Input placeholder="Observações (opcional)" /></div>
                <Button className="w-full" onClick={() => { setNewOpen(false); toast({ title: "Vistoria criada!" }); }}>Criar Vistoria</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou vistoriador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
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

        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Vistoriador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Mobuss</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                </tr></thead>
                <tbody>
                  {filtered.map(ins => {
                    const client = mockClients.find(c => c.id === ins.idclient);
                    return (
                      <tr key={ins.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{client?.name}<span className="text-muted-foreground text-xs ml-2">{client?.unit}</span></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(ins.datetime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{ins.inspector || "—"}</td>
                        <td className="px-4 py-3">{ins.mobuss ? <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Sim</span> : <span className="text-xs text-muted-foreground">Não</span>}</td>
                        <td className="px-4 py-3"><StatusBadge status={ins.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
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
                    {items.map(ins => {
                      const client = mockClients.find(c => c.id === ins.idclient);
                      return (
                        <div key={ins.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-primary font-medium">
                              {new Date(ins.datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{client?.name} <span className="text-muted-foreground">— {client?.unit}</span></p>
                              <p className="text-xs text-muted-foreground">{ins.inspector || "Vistoriador não definido"}</p>
                            </div>
                          </div>
                          <StatusBadge status={ins.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModuleLayout>
  );
};

export default Vistorias;
