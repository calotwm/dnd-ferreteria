import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Money from "./Money";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Debt {
  id: string;
  totalCents: number;
  remainingCents: number;
  dueAt: string | null;
}

export default function ClientDebtReport() {
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<Customer[]>("/customers"),
  });

  const debts = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const customersList = await apiFetch<Customer[]>("/customers");
      const all: Array<{ customer: Customer; debt: Debt }> = [];
      for (const c of customersList) {
        const history = await apiFetch<{ debts: Debt[] }>(`/customers/${c.id}/history`);
        for (const d of history.debts) {
          if (Number(d.remainingCents) > 0) all.push({ customer: c, debt: d });
        }
      }
      return all;
    },
    enabled: Boolean(customers.data),
  });

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low text-on-surface-variant text-label-caps font-label-caps">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Saldo pendiente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {(debts.data ?? []).map(({ customer, debt }) => (
            <tr key={debt.id}>
              <td className="px-4 py-3 text-on-surface">{customer.name}</td>
              <td className="px-4 py-3">
                <Money value={debt.totalCents} />
              </td>
              <td className="px-4 py-3">
                <Money value={debt.remainingCents} className="text-primary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
