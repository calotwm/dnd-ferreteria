import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import DebtReminders from "../components/DebtReminders";
import ClientDebtReport from "../components/ClientDebtReport";
import Money from "../components/Money";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export default function Clients() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<Customer[]>("/customers"),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({ name, phone: phone || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setName("");
      setPhone("");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Clientes
          </h2>
          <p className="text-on-surface-variant mt-1">Clientes, fiados y abonos</p>
        </div>
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
        {customers.data?.map((c) => (
          <li key={c.id} className="px-4 py-3 flex justify-between items-center">
            <span className="text-on-surface">{c.name}</span>
            {c.phone && (
              <span className="text-on-surface-variant font-data-mono">{c.phone}</span>
            )}
          </li>
        ))}
      </ul>

      <div>
        <h3 className="font-title-md text-title-md text-on-surface mb-3">Recordatorios de deudas</h3>
        <DebtReminders />
      </div>

      <div>
        <h3 className="font-title-md text-title-md text-on-surface mb-3">Reporte de deudas</h3>
        <ClientDebtReport />
      </div>
    </div>
  );
}
