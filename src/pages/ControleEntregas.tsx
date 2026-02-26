import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, Users2, ClipboardCheck, XCircle, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Configurações",
    description: "Gerenciar usuários e empreendimentos",
    icon: Settings,
    path: "/solucoes/controle-entregas/configuracoes",
    color: "from-[hsl(220,70%,45%)] to-[hsl(220,80%,60%)]",
  },
  {
    title: "Visão Geral de Clientes",
    description: "Cadastro, overview, elegibilidade e timeline dos clientes",
    icon: Users2,
    path: "/solucoes/controle-entregas/clientes",
    color: "from-[hsl(152,60%,40%)] to-[hsl(160,55%,50%)]",
  },
  {
    title: "Vistorias",
    description: "Agendamento e acompanhamento em lista e calendário",
    icon: ClipboardCheck,
    path: "/solucoes/controle-entregas/vistorias",
    color: "from-[hsl(36,95%,55%)] to-[hsl(25,95%,55%)]",
  },
  {
    title: "Recusas",
    description: "Acompanhamento e resolução de recusas de vistorias",
    icon: XCircle,
    path: "/solucoes/controle-entregas/recusas",
    color: "from-[hsl(0,72%,51%)] to-[hsl(350,75%,55%)]",
  },
  {
    title: "Dashboard",
    description: "Métricas, gráficos e indicadores de desempenho",
    icon: BarChart3,
    path: "/solucoes/controle-entregas/dashboard",
    color: "from-[hsl(270,60%,50%)] to-[hsl(280,70%,60%)]",
  },
];

const ControleEntregas = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/solucoes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Controle Geral de Entregas</h1>
            <p className="text-xs text-muted-foreground">Selecione um módulo</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {modules.map((mod, i) => (
            <motion.button
              key={mod.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(mod.path)}
              className="text-left p-7 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-5 shadow-md group-hover:shadow-lg transition-shadow`}>
                <mod.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{mod.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ControleEntregas;
