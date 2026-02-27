import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  ClipboardCheck, XCircle, CheckCircle2, Clock, Users2, Building2,
  TrendingUp, AlertTriangle, CalendarDays, Loader2, ChevronLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const COLORS = [
  "hsl(220, 70%, 45%)", "hsl(152, 60%, 40%)", "hsl(36, 95%, 55%)",
  "hsl(0, 72%, 51%)", "hsl(200, 80%, 50%)", "hsl(270, 60%, 50%)",
];

const DashboardPage = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterEnterprise, setFilterEnterprise] = useState<string>("all");
  const [entOpen, setEntOpen] = useState(false);

  // Timeline drill-down
  const [drillLevel, setDrillLevel] = useState<"month" | "day">("month");
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  const { data: inspections = [], isLoading: loadingInspections } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => api.inspections.list(),
  });
  const { data: rejections = [], isLoading: loadingRejections } = useQuery({
    queryKey: ["rejections"],
    queryFn: () => api.rejections.list(),
  });
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.list(),
  });
  const { data: enterprises = [] } = useQuery({
    queryKey: ["enterprises"],
    queryFn: () => api.enterprises.list(),
  });
  const { data: overviews = [], isLoading: loadingOverviews } = useQuery({
    queryKey: ["overviews"],
    queryFn: () => api.overview.list(),
  });
  const { data: eligible = [] } = useQuery({
    queryKey: ["eligible"],
    queryFn: () => api.eligible.list(),
  });

  const isLoading = loadingInspections || loadingRejections || loadingClients || loadingOverviews;

  const filteredClientIds = useMemo(() => {
    if (filterEnterprise === "all") return null;
    return new Set(clients.filter((c) => String(c.identerprise) === filterEnterprise).map((c) => c.id));
  }, [filterEnterprise, clients]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((ins) => {
      if (filteredClientIds && !filteredClientIds.has(ins.idclient)) return false;
      if (dateFrom && ins.datetime < dateFrom) return false;
      if (dateTo && ins.datetime > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [inspections, filteredClientIds, dateFrom, dateTo]);

  const filteredRejections = useMemo(() => {
    return rejections.filter((rej) => {
      const ins = inspections.find((i) => i.id === rej.idinspection);
      if (!ins) return false;
      if (filteredClientIds && !filteredClientIds.has(ins.idclient)) return false;
      if (dateFrom && ins.datetime < dateFrom) return false;
      if (dateTo && ins.datetime > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [rejections, inspections, filteredClientIds, dateFrom, dateTo]);

  const filteredOverviews = useMemo(() => {
    if (!filteredClientIds) return overviews;
    return overviews.filter((o) => {
      const client = o.client || clients.find((c) => c.id === o.idclient);
      return client && filteredClientIds.has(client.id);
    });
  }, [overviews, filteredClientIds, clients]);

  const totalInspections = filteredInspections.length;
  const accepted = filteredInspections.filter((i) => i.status === "ACEITE").length;
  const rejected = filteredInspections.filter((i) => i.status === "RECUSA").length;
  const pending = filteredInspections.filter((i) => i.status === "AGUARDANDO").length;
  const cancelled = filteredInspections.filter((i) => i.status === "CANCELADA").length;
  const acceptanceRate = (accepted + rejected) > 0 ? Math.round((accepted / (accepted + rejected)) * 100) : 0;

  const statusData = [
    { name: "Aceitas", value: accepted, color: "hsl(152, 60%, 40%)" },
    { name: "Recusadas", value: rejected, color: "hsl(0, 72%, 51%)" },
    { name: "Aguardando", value: pending, color: "hsl(36, 95%, 55%)" },
    { name: "Canceladas", value: cancelled, color: "hsl(220, 10%, 60%)" },
  ];

  const byEnterprise = useMemo(() => {
    const entList = filterEnterprise === "all" ? enterprises : enterprises.filter((e) => String(e.id) === filterEnterprise);
    return entList.map((ent) => {
      const cIds = clients.filter((c) => c.identerprise === ent.id).map((c) => c.id);
      return {
        name: ent.name,
        vistorias: filteredInspections.filter((i) => cIds.includes(i.idclient)).length,
        recusas: filteredRejections.filter((r) => {
          const ins = inspections.find((i) => i.id === r.idinspection);
          return ins && cIds.includes(ins.idclient);
        }).length,
      };
    });
  }, [enterprises, clients, filteredInspections, filteredRejections, inspections, filterEnterprise]);

  const overviewStatus = [
    { name: "Liberada", value: filteredOverviews.filter((o) => o.status === "LIBERADA").length, color: COLORS[1] },
    { name: "Pendente", value: filteredOverviews.filter((o) => o.status === "PENDENTE").length, color: COLORS[2] },
    { name: "Em Andamento", value: filteredOverviews.filter((o) => o.status === "EM ANDAMENTO").length, color: COLORS[0] },
  ];

  const monthTimelineData = useMemo(() => {
    const map: Record<string, { vistorias: number; aceitas: number; recusas: number }> = {};
    filteredInspections.forEach((ins) => {
      const d = new Date(ins.datetime);
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      if (!map[key]) map[key] = { vistorias: 0, aceitas: 0, recusas: 0 };
      map[key].vistorias++;
      if (ins.status === "ACEITE") map[key].aceitas++;
      if (ins.status === "RECUSA") map[key].recusas++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => {
        const [am, ay] = a.split("/"); const [bm, by] = b.split("/");
        return new Date(Number(ay), Number(am) - 1).getTime() - new Date(Number(by), Number(bm) - 1).getTime();
      })
      .map(([date, v]) => ({ date, ...v }));
  }, [filteredInspections]);

  const dayTimelineData = useMemo(() => {
    if (!drillMonth) return [];
    const [mm, yyyy] = drillMonth.split("/");
    const map: Record<string, { vistorias: number; aceitas: number; recusas: number }> = {};
    filteredInspections
      .filter((ins) => {
        const d = new Date(ins.datetime);
        return String(d.getMonth() + 1).padStart(2, "0") === mm && String(d.getFullYear()) === yyyy;
      })
      .forEach((ins) => {
        const d = new Date(ins.datetime);
        const key = `${String(d.getDate()).padStart(2, "0")}/${mm}`;
        if (!map[key]) map[key] = { vistorias: 0, aceitas: 0, recusas: 0 };
        map[key].vistorias++;
        if (ins.status === "ACEITE") map[key].aceitas++;
        if (ins.status === "RECUSA") map[key].recusas++;
      });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
  }, [filteredInspections, drillMonth]);

  const activeTimelineData = drillLevel === "month" ? monthTimelineData : dayTimelineData;

  const remanescentes = filteredOverviews.filter((o) => o.remanescente).length;
  const filteredEligible = useMemo(() => {
    if (!filteredClientIds) return eligible;
    return eligible.filter((e) => filteredClientIds.has(e.id));
  }, [eligible, filteredClientIds]);

  const selectedEntName = filterEnterprise === "all"
    ? "Todos os empreendimentos"
    : enterprises.find((e) => String(e.id) === filterEnterprise)?.name || "";

  const cards = [
    { label: "Total de Vistorias", value: totalInspections, icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "Aceitas", value: accepted, icon: CheckCircle2, color: "bg-success/10 text-success" },
    { label: "Recusas", value: filteredRejections.length, icon: XCircle, color: "bg-destructive/10 text-destructive" },
    { label: "Aguardando", value: pending, icon: Clock, color: "bg-warning/10 text-warning" },
    { label: "Clientes", value: filteredClientIds ? filteredClientIds.size : clients.length, icon: Users2, color: "bg-info/10 text-info" },
    { label: "Empreendimentos", value: filterEnterprise === "all" ? enterprises.length : 1, icon: Building2, color: "bg-primary/10 text-primary" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos indicadores de entregas e vistorias</p>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap bg-card rounded-xl border border-border p-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data Início</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px] h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data Fim</Label>
          <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-[150px] h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="block text-xs text-muted-foreground">Empreendimento</Label>
          <Popover open={entOpen} onOpenChange={setEntOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[220px] justify-start h-8 text-sm font-normal">
                <span className="truncate">{selectedEntName}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar empreendimento..." />
                <CommandList>
                  <CommandEmpty>Nenhum encontrado</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__all__" onSelect={() => { setFilterEnterprise("all"); setEntOpen(false); }}>
                      Todos os empreendimentos
                    </CommandItem>
                    {enterprises.map((e) => (
                      <CommandItem key={e.id} value={e.name} onSelect={() => { setFilterEnterprise(String(e.id)); setEntOpen(false); }}>
                        {e.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {(dateFrom || dateTo || filterEnterprise !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); setFilterEnterprise("all"); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border p-3">
            <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Highlight row */}
      <div className="grid sm:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-success" /></div>
          <div><p className="text-2xl font-bold text-foreground">{acceptanceRate}%</p><p className="text-xs text-muted-foreground">Taxa de aprovação</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning" /></div>
          <div><p className="text-2xl font-bold text-foreground">{remanescentes}</p><p className="text-xs text-muted-foreground">Clientes remanescentes</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-info" /></div>
          <div><p className="text-2xl font-bold text-foreground">{filteredEligible.length}</p><p className="text-xs text-muted-foreground">Aptos para agendamento</p></div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Status das Vistorias</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Vistorias e Recusas por Empreendimento</h3>
          <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
            <ResponsiveContainer width="100%" height={Math.max(200, byEnterprise.length * 44)}>
              <BarChart data={byEnterprise} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="vistorias" fill="hsl(220, 70%, 45%)" radius={[0, 4, 4, 0]} name="Vistorias" barSize={12} />
                <Bar dataKey="recusas" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} name="Recusas" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Vistorias ao Longo do Tempo</h3>
            <div className="flex items-center gap-2">
              {drillLevel === "day" && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setDrillLevel("month"); setDrillMonth(null); }}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {drillLevel === "month" ? "Clique para ver por dia" : drillMonth}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={activeTimelineData}
              onClick={(data) => {
                if (drillLevel === "month" && data?.activePayload?.[0]?.payload?.date) {
                  setDrillMonth(data.activePayload[0].payload.date as string);
                  setDrillLevel("day");
                }
              }}
              style={{ cursor: drillLevel === "month" ? "pointer" : "default" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="vistorias" stroke="hsl(220, 70%, 45%)" fill="hsl(220, 70%, 45%)" fillOpacity={0.15} name="Agendadas" />
              <Area type="monotone" dataKey="aceitas" stroke="hsl(152, 60%, 40%)" fill="hsl(152, 60%, 40%)" fillOpacity={0.15} name="Aceitas" />
              <Area type="monotone" dataKey="recusas" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.15} name="Recusas" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Overview dos Clientes por Status</h3>
          <div className="space-y-3">
            {overviewStatus.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${filteredOverviews.length > 0 ? (item.value / filteredOverviews.length) * 100 : 0}%` }} transition={{ duration: 0.8, delay: 0.6 }} className="h-full rounded-full" style={{ backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
