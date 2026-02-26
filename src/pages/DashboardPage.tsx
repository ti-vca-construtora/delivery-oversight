import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { ClipboardCheck, XCircle, CheckCircle2, Clock, Users2, Building2 } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import { mockInspections, mockRejections, mockClients, mockEnterprises, mockOverviews } from "@/lib/mock-data";

const COLORS = [
  "hsl(220, 70%, 45%)",
  "hsl(152, 60%, 40%)",
  "hsl(36, 95%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 80%, 50%)",
  "hsl(270, 60%, 50%)",
];

const DashboardPage = () => {
  const totalInspections = mockInspections.length;
  const accepted = mockInspections.filter(i => i.status === "ACEITE").length;
  const rejected = mockInspections.filter(i => i.status === "RECUSA").length;
  const pending = mockInspections.filter(i => i.status === "AGUARDANDO").length;

  const statusData = [
    { name: "Aceitas", value: accepted, color: "hsl(152, 60%, 40%)" },
    { name: "Recusadas", value: rejected, color: "hsl(0, 72%, 51%)" },
    { name: "Aguardando", value: pending, color: "hsl(36, 95%, 55%)" },
    { name: "Canceladas", value: mockInspections.filter(i => i.status === "CANCELADA").length, color: "hsl(220, 10%, 60%)" },
  ];

  const byEnterprise = mockEnterprises.map(ent => {
    const clientIds = mockClients.filter(c => c.identerprise === ent.id).map(c => c.id);
    return {
      name: ent.name.split(" ").slice(0, 2).join(" "),
      vistorias: mockInspections.filter(i => clientIds.includes(i.idclient)).length,
      recusas: mockRejections.filter(r => {
        const ins = mockInspections.find(i => i.id === r.idinspection);
        return ins && clientIds.includes(ins.idclient);
      }).length,
    };
  });

  const overviewStatus = [
    { name: "Liberada", value: mockOverviews.filter(o => o.status === "LIBERADA").length },
    { name: "Pendente", value: mockOverviews.filter(o => o.status === "PENDENTE").length },
    { name: "Em Andamento", value: mockOverviews.filter(o => o.status === "EM ANDAMENTO").length },
  ];

  const cards = [
    { label: "Total de Vistorias", value: totalInspections, icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
    { label: "Aceitas", value: accepted, icon: CheckCircle2, color: "bg-success/10 text-success" },
    { label: "Recusas", value: mockRejections.length, icon: XCircle, color: "bg-destructive/10 text-destructive" },
    { label: "Aguardando", value: pending, icon: Clock, color: "bg-warning/10 text-warning" },
    { label: "Clientes", value: mockClients.length, icon: Users2, color: "bg-info/10 text-info" },
    { label: "Empreendimentos", value: mockEnterprises.length, icon: Building2, color: "bg-primary/10 text-primary" },
  ];

  return (
    <ModuleLayout title="Dashboard">
      <div className="space-y-6">
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie: Status das Vistorias */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Status das Vistorias</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar: Por Empreendimento */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Vistorias e Recusas por Empreendimento</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byEnterprise}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="vistorias" fill="hsl(220, 70%, 45%)" radius={[4, 4, 0, 0]} name="Vistorias" />
                <Bar dataKey="recusas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Recusas" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Status Overview Clientes */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">Overview dos Clientes por Status</h3>
            <div className="grid grid-cols-3 gap-4">
              {overviewStatus.map((item, i) => (
                <div key={item.name} className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-3xl font-bold text-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.name}</p>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.value / mockOverviews.length) * 100}%`,
                        backgroundColor: COLORS[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </ModuleLayout>
  );
};

export default DashboardPage;
