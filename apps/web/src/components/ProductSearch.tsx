import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { useCartStore } from "../stores/cartStore";
import Money from "./Money";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  priceCents: number;
  stock: number;
  variants: Array<{ id: string; barcode: string | null; priceCents: number; stock: number }>;
}

export default function ProductSearch() {
  const [q, setQ] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery({
    queryKey: ["products", "search", q],
    queryFn: () => apiFetch<Product[]>(`/products/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });

  const addProduct = (product: Product) => {
    const variant = product.variants[0];
    if (!variant) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      unitPriceCents: variant.priceCents,
    });
    setQ("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center bg-surface-container-low rounded border border-outline-variant px-3 py-2 focus-within:border-primary transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
        <input
          className="bg-transparent border-none focus:ring-0 text-body-sm w-full text-on-surface placeholder-on-surface-variant outline-none"
          placeholder="Buscar producto por nombre o código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-on-surface-variant text-body-sm">Buscando…</p>}

      {data && data.length > 0 && (
        <ul className="divide-y divide-outline-variant card max-h-72 overflow-y-auto">
          {data.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => addProduct(p)}
                className="w-full flex justify-between items-center px-4 py-3 hover:bg-surface-container-high text-left"
              >
                <span className="text-on-surface">{p.name}</span>
                <span className="text-on-surface-variant flex items-center gap-2">
                  <Money value={p.priceCents} />
                  <span className="material-symbols-outlined text-primary">add_circle</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
