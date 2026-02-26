import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ClipboardCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const solutions = [
  {
    title: "Agenda de Vistorias",
    description: "Gestão de agendamentos de vistorias de empreendimentos",
    icon: ClipboardCheck,
    path: "/solucoes/agenda-vistorias",
    disabled: true,
  },
  {
    title: "Controle Geral de Entregas",
    description: "Gerenciamento completo de vistorias, recusas e entregas",
    icon: Building2,
    path: "/solucoes/controle-entregas",
    disabled: false,
  },
];

const Solucoes = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Setor de Entregas</h1>
              <p className="text-xs text-muted-foreground">Selecione uma solução</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">Soluções Disponíveis</h2>
          <p className="text-muted-foreground">Escolha a solução que deseja acessar</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {solutions.map((sol, i) => (
            <motion.div
              key={sol.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => !sol.disabled && navigate(sol.path)}
                disabled={sol.disabled}
                className={`w-full text-left p-8 rounded-xl border transition-all duration-300 ${
                  sol.disabled
                    ? "bg-muted/50 border-border opacity-50 cursor-not-allowed"
                    : "bg-card border-border hover:border-primary hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
                  sol.disabled ? "bg-muted" : "gradient-primary shadow-glow"
                }`}>
                  <sol.icon className={`w-7 h-7 ${sol.disabled ? "text-muted-foreground" : "text-primary-foreground"}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{sol.title}</h3>
                <p className="text-sm text-muted-foreground">{sol.description}</p>
                {sol.disabled && (
                  <span className="inline-block mt-3 text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                    Em breve
                  </span>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Solucoes;
