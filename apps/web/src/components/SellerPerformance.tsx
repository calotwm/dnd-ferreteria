import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Money from "./Money";

interface Seller {
  id: string;
  name: string;
  role: string;
  salesCount: number;
  totalCents: number;
}

export default function SellerPerformance() {
  const { data } = useQuery({
    queryKey: ["sellers", "performance"],
    queryFn: () => apiFetch<Seller[]>("/sellers/performance"),
  });

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low text-on-surface-variant text-label-caps font-label-caps">
          <tr>
            <th className="px-4 py-3">Empleado</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Ventas</th>
            <th className="px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {(data ?? []).map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 text-on-surface">{s.name}</td>
              <td className="px-4 py-3 text-on-surface-variant capitalize">{s.role.toLowerCase()}</td>
              <td className="px-4 py-3 font-data-mono">{s.salesCount}</td>
              <td className="px-4 py-3">
                <Money value={s.totalCents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
