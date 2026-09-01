import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Money from "../components/Money";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
}
interface Purchase {
  id: string;
  totalCents: number;
  createdAt: string;
  supplier: { name: string };
}

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
  });
  const purchases = useQuery({
    queryKey: ["purchases"],
    queryFn: () => apiFetch<Purchase[]>("/purchases"),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch("/suppliers", {
        method: "POST",
        body: JSON.stringify({ name, phone: phone || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setName("");
      setPhone("");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
          Proveedores
        </h2>
        <p className="text-on-surface-variant mt-1">Proveedores y compras</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name) addMutation.mutate();
        }}
        className="card p-6 flex flex-col md:flex-row gap-3"
      >
        <input
          className="input-field flex-1"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input-field w-full md:w-48"
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Agregar
        </button>
      </form>

      <ul className="card divide-y divide-outline-variant">
        {suppliers.data?.map((s) => (
          <li key={s.id} className="px-4 py-3 flex justify-between items-center">
            <span className="text-on-surface">{s.name}</span>
            {s.phone && <span className="text-on-surface-variant font-data-mono">{s.phone}</span>}
          </li>
        ))}
      </ul>

      <div>
        <h3 className="font-title-md text-title-md text-on-surface mb-3">Compras recientes</h3>
        <ul className="card divide-y divide-outline-variant">
          {purchases.data?.map((p) => (
            <li key={p.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <span className="text-on-surface">{p.supplier.name}</span>
                <p className="text-on-surface-variant text-body-sm">
                  {new Date(p.createdAt).toLocaleDateString("es-AR")}
                </p>
              </div>
              <Money value={p.totalCents} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
