import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isLowStock } from "@dnd/shared";
import { apiFetch } from "../api/client";
import { useCartStore } from "../stores/cartStore";
import Money from "./Money";
import ShareButton from "./ShareButton";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  imageUrl: string | null;
  priceCents: number;
  stock: number;
  variants: Array<{ id: string; priceCents: number; stock: number }>;
}

/**
 * POS product picker: catalog-style square panels (image + name + price).
 * Fed by GET /products (has variants, so a click can resolve variants[0] and
 * add to cart). Search filters the panels client-side; low stock (<5) is
 * flagged on the panel.
 */
export default function ProductPicker() {
  const [q, setQ] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products?limit=200"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = data ?? [];
    if (!term) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.barcode ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  const addProduct = (product: Product) => {
    const variant = product.variants[0];
    if (!variant) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      unitPriceCents: variant.priceCents,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center bg-surface-container-low rounded border border-outline-variant px-3 py-2 focus-within:border-primary transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
        <input
          className="bg-transparent border-none focus:ring-0 text-body-sm w-full text-on-surface placeholder-on-surface-variant outline-none"
          placeholder="Buscar producto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-on-surface-variant text-body-sm">Cargando productos…</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-on-surface-variant text-body-sm">Sin productos.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {filtered.map((p) => {
          const low = isLowStock(p.stock);
          return (
            <div key={p.id} className="card overflow-hidden flex flex-col relative">
              <button
                type="button"
                onClick={() => addProduct(p)}
                aria-label={`Agregar ${p.name} al carrito`}
                className="flex flex-col flex-1 text-left cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <div className="relative w-full aspect-square">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover bg-surface-container-high"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl">image</span>
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <h3 className="font-title-md text-title-md text-on-surface truncate">{p.name}</h3>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <Money value={p.priceCents} className="text-primary" />
                    {low && (
                      <span className="text-label-caps font-label-caps text-error">Stock bajo</span>
                    )}
                  </div>
                </div>
              </button>
              <span className="absolute top-2 right-2">
                <ShareButton name={p.name} priceCents={p.priceCents} compact />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
