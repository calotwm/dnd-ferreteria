import { useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth";
import Onboarding from "../components/Onboarding";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
          Configuración
        </h2>
        <p className="text-on-surface-variant mt-1">Negocio y cuenta</p>
      </div>

      <div className="card p-6 flex flex-col gap-2">
        <h3 className="font-title-md text-title-md text-on-surface">Negocio</h3>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Nombre</span>
          <span className="text-on-surface">{user?.businessName ?? "DND Ferretería"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Moneda</span>
          <span className="text-on-surface font-data-mono">ARS</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Sucursal</span>
          <span className="text-on-surface">{user?.branchName ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Usuario</span>
          <span className="text-on-surface">{user?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Rol</span>
          <span className="text-on-surface capitalize">{user?.role.toLowerCase()}</span>
        </div>
      </div>

      <Onboarding />

      <button
        onClick={async () => {
          await logout();
          navigate("/login");
        }}
        className="btn-secondary"
      >
        <span className="material-symbols-outlined">logout</span>
        Cerrar sesión
      </button>
    </div>
  );
}
