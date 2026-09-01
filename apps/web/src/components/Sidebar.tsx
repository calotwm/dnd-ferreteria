import { NavLink, useNavigate } from "react-router-dom";
import { readableModules, type Module, type Role } from "@dnd/shared";
import { useAuth } from "../api/auth";
import LowStockBell from "./LowStockBell";

interface NavItem {
  module: Module;
  label: string;
  icon: string;
  to: string;
}

const NAV: NavItem[] = [
  { module: "dashboard", label: "Dashboard", icon: "dashboard", to: "/dashboard" },
  { module: "pos", label: "Vender", icon: "point_of_sale", to: "/pos" },
  { module: "inventory", label: "Inventario", icon: "inventory_2", to: "/inventory" },
  { module: "expenses", label: "Gastos", icon: "payments", to: "/expenses" },
  { module: "clients", label: "Clientes", icon: "group", to: "/clients" },
  { module: "suppliers", label: "Proveedores", icon: "conveyor_belt", to: "/suppliers" },
  { module: "employees", label: "Empleados", icon: "badge", to: "/employees" },
  { module: "stats", label: "Estadísticas", icon: "monitoring", to: "/stats" },
  { module: "catalog", label: "Catálogo", icon: "menu_book", to: "/catalog" },
  { module: "receipts", label: "Comprobantes", icon: "receipt_long", to: "/receipts" },
  { module: "settings", label: "Configuración", icon: "settings", to: "/settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const allowed = new Set(readableModules((user?.role ?? "SELLER") as Role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full flex-col py-margin-desktop bg-surface-container border-r border-outline-variant w-64 z-40">
      <div className="px-margin-desktop mb-8 flex items-center gap-gutter">
        <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary-container">hardware</span>
        </div>
        <div className="flex-1">
          <h1 className="font-headline-lg text-title-md text-primary font-bold">DND Ferretería</h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant">{user?.name}</p>
        </div>
        <LowStockBell />
      </div>

      <nav className="flex-1 overflow-y-auto w-full px-4 flex flex-col gap-unit">
        {NAV.filter((item) => allowed.has(item.module)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-gutter px-4 py-3 rounded text-label-caps font-label-caps transition-all cursor-pointer ${
                isActive
                  ? "text-primary bg-surface-container-highest border-r-4 border-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-gutter px-4 py-3 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all cursor-pointer w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-caps text-label-caps">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
