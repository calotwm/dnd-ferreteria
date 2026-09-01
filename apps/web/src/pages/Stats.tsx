import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { formatMoney } from "@dnd/shared";
import StatCard from "../components/StatCard";
import ExportButton from "../components/ExportButton";
import Money from "../components/Money";

interface SalesStats {
  period: string;
  current: { count: number; totalCents: number };
  previous: { count: number; totalCents: number };
}
interface CashFlow {
  income: number;
  expenses: number;
  net: number;
}
interface TopProduct {
  id: string;
  name: string;
  qty: number;
  revenue: number;
}

export default function Stats() {
  const sales = useQuery({
    queryKey: ["stats", "sales", "month"],
    queryFn: () => apiFetch<SalesStats>("/stats/sales?period=month"),
  });
  const cash = useQuery({
    queryKey: ["stats", "cash-flow"],
    queryFn: () => apiFetch<CashFlow>("/stats/cash-flow"),
  });
  const top = useQuery({
    queryKey: ["stats", "top-products"],
    queryFn: () => apiFetch<TopProduct[]>("/stats/top-products"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Estadísticas
          </h2>
          <p className="text-on-surface-variant mt-1">Ventas, caja y productos</p>
        </div>
        <ExportButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <StatCard
          label="Ventas del mes"
          value={formatMoney(sales.data?.current.totalCents ?? 0)}
          icon="point_of_sale"
          delta={`${sales.data?.current.count ?? 0} ventas`}
        />
        <StatCard
          label="Ingresos"
          value={formatMoney(cash.data?.income ?? 0)}
          icon="trending_up"
        />
        <StatCard
          label="Gastos"
          value={formatMoney(cash.data?.expenses ?? 0)}
          icon="payments"
        />
      </div>

      <div>
        <h3 className="font-title-md text-title-md text-on-surface mb-3">Productos más vendidos</h3>
        <ul className="card divide-y divide-outline-variant">
          {top.data?.map((p) => (
            <li key={p.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-on-surface">{p.name}</p>
                <p className="text-on-surface-variant text-body-sm">{p.qty} unidades</p>
              </div>
              <Money value={p.revenue} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
