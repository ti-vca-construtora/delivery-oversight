import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  ClipboardCheck,
  XCircle,
  CheckCircle2,
  Clock,
  Users2,
  Building2,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

const COLORS = [
  "hsl(220, 70%, 45%)",
  "hsl(152, 60%, 40%)",
  "hsl(36, 95%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 80%, 50%)",
  "hsl(270, 60%, 50%)",
];

const DashboardPage = () => {
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

  const totalInspections = inspections.length;
  const accepted = inspections.filter((i) => i.status === "ACEITE").length;
  const rejected = inspections.filter((i) => i.status === "RECUSA").length;
  const pending = inspections.filter((i) => i.status === "AGUARDANDO").length;
  const cancelled = inspections.filter((i) => i.status === "CANCELADA").length;

  const acceptanceRate = totalInspections > 0 ? Math.round((accepted / totalInspections) * 100) : 0;

  const statusData = [
    { name: "Aceitas", value: accepted, color: "hsl(152, 60%, 40%)" },
    { name: "Recusadas", value: rejected, color: "hsl(0, 72%, 51%)" },
    { name: "Aguardando", value: pending, color: "hsl(36, 95%, 55%)" },
    { name: "Canceladas", value: cancelled, color: "hsl(220, 10%, 60%)" },
  ];

  const byEnterprise = useMemo(() => {
    return enterprises.map((ent) => {
      const clientIds = clients.filter((c) => c.identerprise === ent.id).map((c) => c.id);
      return {
        name: ent.name.split(" ").slice(0, 2).join(" "),
        vistorias: inspections.filter((i) => clientIds.includes(i.idclient)).length,
        recusas: rejections.filter((r) => {
          const ins = inspections.find((i) => i.id === r.idinspection);
          return ins && clientIds.includes(ins.idclient);
        }).length,
      };
    });
  }, [enterprises, clients, inspections, rejections]);

  const overviewStatus = [
    { name: "Liberada", value: overviews.filter((o) => o.status === "LIBERADA").length, color: COLORS[1] },
    { name: "Pendente", value: overviews.filter((o) => o.status === "PENDENTE").length, color: COLORS[2] },
    { name: "Em Andamento", value: overviews.filter((o) => o.status === "EM ANDAMENTO").length, color: COLORS[0] },
  ];

  const timelineData = useMemo(() => {
    const dayMap: Record<string, { vistorias: number; aceitas: number; recusas: number }> = {};
    inspections.forEach((ins) => {
      const d = new Date(ins.datetime);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!dayMap[key]) dayMap[key] = { vistorias: 0, aceitas: 0, recusas: 0 };
      dayMap[key].vistorias++;
      if (ins.status === "ACEITE") dayMap[key].aceitas++;
      if (ins.status === "RECUSA") dayMap[key].recusas++;
    });
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [inspections]);

  const rejectionsByConstruction = useMemo(() => {
    const map: Record<string, number> = {};
    rejections.forEach((r) => {
      map[r.construction_status] = (map[r.construction_status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rejections]);

  const remanescentes = overviews.filter((o) => o.remanescente).length;

  const cards = [
    { label: "Total de Vistorias", value: totalInspections, icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "Aceitas", value: accepted, icon: CheckCircle2, color: "bg-success/10 text-success" },
    { label: "Recusas", value: rejections.length, icon: XCircle, color: "bg-destructive/10 text-destructive" },
    { label: "Aguardando", value: pending, icon: Clock, color: "bg-warning/10 text-warning" },
    { label: "Clientes", value: clients.length, icon: Users2, color: "bg-info/10 text-info" },
    { label: "Empreendimentos", value: enterprises.length, icon: Building2, color: "bg-primary/10 text-primary" },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos indicadores de entregas e vistorias</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Highlight row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{acceptanceRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa de aprovação</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{remanescentes}</p>
            <p className="text-xs text-muted-foreground">Clientes remanescentes</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{eligible.length}</p>
            <p className="text-xs text-muted-foreground">Aptos para agendamento</p>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Status das Vistorias</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Vistorias e Recusas por Empreendimento</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byEnterprise}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="vistorias" fill="hsl(220, 70%, 45%)" radius={[4, 4, 0, 0]} name="Vistorias" />
              <Bar dataKey="recusas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Recusas" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Area */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Vistorias ao Longo do Tempo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="vistorias" stroke="hsl(220, 70%, 45%)" fill="hsl(220, 70%, 45%)" fillOpacity={0.15} name="Agendadas" />
              <Area type="monotone" dataKey="aceitas" stroke="hsl(152, 60%, 40%)" fill="hsl(152, 60%, 40%)" fillOpacity={0.15} name="Aceitas" />
              <Area type="monotone" dataKey="recusas" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.15} name="Recusas" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Overview */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Overview dos Clientes por Status</h3>
          <div className="space-y-4">
            {overviewStatus.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overviews.length > 0 ? (item.value / overviews.length) * 100 : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Recusas por Status de Obra</h4>
            <div className="flex gap-4">
              {rejectionsByConstruction.map((item) => (
                <div key={item.name} className="flex-1 text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.name}</p>
                </div>
              ))}
              {rejectionsByConstruction.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma recusa registrada</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
