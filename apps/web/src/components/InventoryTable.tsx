import { isLowStock } from "@dnd/shared";
import Money from "./Money";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  categoryName: string | null;
  priceCents: number;
  stock: number;
}

export default function InventoryTable({ products }: { products: Product[] }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low text-on-surface-variant text-label-caps font-label-caps">
          <tr>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3">Precio</th>
            <th className="px-4 py-3">Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {products.map((p) => {
            const low = isLowStock(p.stock);
            return (
              <tr key={p.id} className="hover:bg-surface-container-low">
                <td className="px-4 py-3">
                  <p className="text-on-surface">{p.name}</p>
                  {p.barcode && (
                    <p className="text-on-surface-variant text-body-sm font-data-mono">{p.barcode}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{p.categoryName ?? "—"}</td>
                <td className="px-4 py-3">
                  <Money value={p.priceCents} />
                </td>
                <td className="px-4 py-3">
                  <span className={low ? "text-error font-data-mono font-bold" : "text-on-surface font-data-mono"}>
                    {p.stock}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
