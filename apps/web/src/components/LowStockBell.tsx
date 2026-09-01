import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { isLowStock } from "@dnd/shared";
import { useLowStockStore } from "../stores/lowStockStore";

interface Product {
  id: string;
  name: string;
  stock: number;
}

/**
 * Header bell with an unread low-stock badge and a dropdown of low-stock items
 * (reuses the `/products` query filtered by `isLowStock`). Clicking "Ver
 * inventario" navigates to Inventory and clears the unread count.
 */
export default function LowStockBell() {
  const navigate = useNavigate();
  const unread = useLowStockStore((s) => s.unread);
  const resetUnread = useLowStockStore((s) => s.resetUnread);
  const [open, setOpen] = useState(false);

  const lowStock = useQuery({
    queryKey: ["products", "low"],
    queryFn: async () => {
      const products = await apiFetch<Product[]>("/products");
      return products.filter((p) => isLowStock(p.stock));
    },
  });

  const goToInventory = () => {
    setOpen(false);
    resetUnread();
    navigate("/inventory");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
        aria-label={`Alertas de stock bajo (${unread})`}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[11px] leading-none flex items-center justify-center font-data-mono">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto card p-3 z-50 shadow-lg">
          <div className="px-1 mb-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              Stock bajo (&lt;5)
            </span>
          </div>
          {lowStock.data?.length ? (
            <ul className="divide-y divide-outline-variant">
              {lowStock.data.map((p) => (
                <li key={p.id} className="py-2 px-1 flex justify-between items-center gap-2">
                  <span className="text-on-surface text-body-sm truncate">{p.name}</span>
                  <span className="text-error font-data-mono text-body-sm shrink-0">{p.stock}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-on-surface-variant text-body-sm px-1 py-2">
              Sin productos con stock bajo.
            </p>
          )}
          <button onClick={goToInventory} className="btn-secondary w-full mt-2">
            Ver inventario
          </button>
        </div>
      )}
    </div>
  );
}
