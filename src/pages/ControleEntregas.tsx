import { Outlet } from "react-router-dom";
import SidebarLayout from "@/components/SidebarLayout";

const ControleEntregas = () => {
  return (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  );
};

export default ControleEntregas;
