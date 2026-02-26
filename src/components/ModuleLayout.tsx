import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleLayoutProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

const ModuleLayout = ({ title, children, actions }: ModuleLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/solucoes/controle-entregas")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">Controle Geral de Entregas</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className="container mx-auto px-6 py-6">{children}</main>
    </div>
  );
};

export default ModuleLayout;
