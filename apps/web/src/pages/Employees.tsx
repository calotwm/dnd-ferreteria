import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import SellerPerformance from "../components/SellerPerformance";
import Money from "../components/Money";

interface Session {
  id: string;
  openingCents: number;
  expectedCents: number;
  countedCents: number | null;
  differenceCents: number | null;
  closedAt: string | null;
  openedAt: string;
}
interface User {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

export default function Employees() {
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SELLER",
    active: true,
  });

  const current = useQuery({
    queryKey: ["cash-session", "current"],
    queryFn: () => apiFetch<{ session: Session | null }>("/cash-sessions/current"),
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
  });

  const openMutation = useMutation({
    mutationFn: () =>
      apiFetch("/cash-sessions/open", {
        method: "POST",
        body: JSON.stringify({ openingCents: Math.round(Number(opening) * 100) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-session", "current"] });
      setOpening("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/cash-sessions/${current.data?.session?.id}/close`, {
        method: "POST",
        body: JSON.stringify({ countedCents: Math.round(Number(counted) * 100) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-session", "current"] });
      setCounted("");
    },
  });

  const session = current.data?.session;

  const createUser = useMutation({
    mutationFn: (body: { name: string; email: string; password: string; role: string; active: boolean }) =>
      apiFetch("/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "SELLER", active: true });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Empleados
          </h2>
          <p className="text-on-surface-variant mt-1">Usuarios, caja y desempeño</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
          Agregar empleado
        </button>
      </div>

      <div className="card p-6 flex flex-col gap-3">
        <h3 className="font-title-md text-title-md text-on-surface">Caja</h3>
        {!session ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(opening) >= 0) openMutation.mutate();
            }}
            className="flex flex-col md:flex-row gap-3"
          >
            <input
              className="input-field"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto inicial de caja"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Abrir caja
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Apertura</span>
              <Money value={session.openingCents} />
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Esperado</span>
              <Money value={session.expectedCents} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (Number(counted) >= 0) closeMutation.mutate();
              }}
              className="flex flex-col md:flex-row gap-3"
            >
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto contado"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
              />
              <button type="submit" className="btn-secondary">
                Cerrar caja
              </button>
            </form>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-title-md text-title-md text-on-surface mb-3">Desempeño por vendedor</h3>
        <SellerPerformance />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low text-on-surface-variant text-label-caps font-label-caps">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {users.data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-on-surface">{u.name}</td>
                <td className="px-4 py-3 text-on-surface-variant capitalize">{u.role.toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className={u.active ? "text-[#4ade80]" : "text-on-surface-variant"}>
                    {u.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
          <div className="card relative z-10 w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-title-md text-title-md text-on-surface">Agregar empleado</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-on-surface-variant hover:text-primary text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.name && form.email && form.password.length >= 6) createUser.mutate(form);
              }}
            >
              <div>
                <label className="text-label-caps font-label-caps text-on-surface-variant mb-1 block">
                  Nombre
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-label-caps font-label-caps text-on-surface-variant mb-1 block">
                  Email
                </label>
                <input
                  className="input-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-label-caps font-label-caps text-on-surface-variant mb-1 block">
                  Contraseña
                </label>
                <input
                  className="input-field"
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-label-caps font-label-caps text-on-surface-variant mb-1 block">
                  Rol
                </label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="SELLER">Vendedor</option>
                  <option value="MANAGER">Gerente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={createUser.isPending}>
                {createUser.isPending ? "Creando..." : "Crear empleado"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
