import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Money from "../components/Money";

interface Category {
  id: string;
  name: string;
}
interface Expense {
  id: string;
  amountCents: number;
  note: string | null;
  spentAt: string;
  category: { name: string };
}

export default function Expenses() {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiFetch<Expense[]>("/expenses"),
  });
  const categories = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => apiFetch<Category[]>("/expense-categories"),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch("/expenses", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          amountCents: Math.round(Number(amount) * 100),
          note: note || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setAmount("");
      setNote("");
    },
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Gastos
          </h2>
          <p className="text-on-surface-variant mt-1">Registro de gastos por categoría</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (categoryId && Number(amount) > 0) addMutation.mutate();
        }}
        className="card p-6 flex flex-col md:flex-row gap-3 mb-6"
      >
        <select
          className="input-field flex-1"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Categoría…</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="input-field w-full md:w-40"
          type="number"
          step="0.01"
          min="0"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="input-field flex-1"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Agregar
        </button>
      </form>

      <ul className="card divide-y divide-outline-variant">
        {expenses.data?.map((e) => (
          <li key={e.id} className="px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-on-surface">{e.category.name}</p>
              {e.note && <p className="text-on-surface-variant text-body-sm">{e.note}</p>}
            </div>
            <Money value={e.amountCents} className="text-error" />
          </li>
        ))}
      </ul>
    </div>
  );
}
