import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ControleEntregas from "./pages/ControleEntregas";
import Configuracoes from "./pages/Configuracoes";
import Clientes from "./pages/Clientes";
import Vistorias from "./pages/Vistorias";
import Recusas from "./pages/Recusas";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/controle-entregas" element={<ControleEntregas />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="vistorias" element={<Vistorias />} />
            <Route path="recusas" element={<Recusas />} />
          </Route>
          {/* Redirect old paths */}
          <Route path="/solucoes/controle-entregas/*" element={<Navigate to="/controle-entregas" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
