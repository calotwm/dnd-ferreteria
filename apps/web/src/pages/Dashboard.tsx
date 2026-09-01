import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatMoney, isLowStock } from "@dnd/shared";
import StatCard from "../components/StatCard";
import Money from "../components/Money";

interface Stats {
  period: string;
  current: { count: number; totalCents: number };
  previous: { count: number; totalCents: number };
}

interface CashFlow {
  income: number;
  expenses: number;
  net: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
}

export default function Dashboard() {
  const stats = useQuery({
    queryKey: ["stats", "sales", "day"],
    queryFn: () => apiFetch<Stats>("/stats/sales?period=day"),
  });

  const cash = useQuery({
    queryKey: ["stats", "cash-flow"],
    queryFn: () => apiFetch<CashFlow>("/stats/cash-flow"),
  });

  const lowStock = useQuery({
    queryKey: ["products", "low"],
    queryFn: async () => {
      const products = await apiFetch<
        Array<{ id: string; name: string; stock: number }>
      >("/products");
      return products.filter((p) => isLowStock(p.stock));
    },
  });

  const salesTotal = stats.data?.current.totalCents ?? 0;
  const salesCount = stats.data?.current.count ?? 0;

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Dashboard
          </h2>
          <p className="text-on-surface-variant mt-1">Resumen del día</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <StatCard
          label="Ventas de hoy"
          value={formatMoney(salesTotal)}
          icon="point_of_sale"
          delta={`${salesCount} ventas`}
        />
        <StatCard
          label="Flujo de caja"
          value={formatMoney(cash.data?.net ?? 0)}
          icon="account_balance_wallet"
        />
        <StatCard
          label="Stock bajo"
          value={String(lowStock.data?.length ?? 0)}
          icon="inventory_2"
          delta="productos"
        />
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-title-md text-title-md text-on-surface mb-4">Stock bajo (&lt;5)</h3>
        {lowStock.data?.length ? (
          <ul className="divide-y divide-outline-variant">
            {lowStock.data.map((p) => (
              <li key={p.id} className="py-3 flex justify-between items-center">
                <span className="text-on-surface">{p.name}</span>
                <span className="text-error font-data-mono">{p.stock} unidades</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-on-surface-variant">Sin productos con stock bajo.</p>
        )}
      </div>

      <div className="card p-6 flex flex-col gap-2">
        <Link
          to="/pos"
          className="btn-primary justify-between"
        >
          <span>Nueva venta</span>
          <span className="material-symbols-outlined">point_of_sale</span>
        </Link>
      </div>
    </div>
  );
}
