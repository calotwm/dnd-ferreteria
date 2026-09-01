import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import InventoryTable from "../components/InventoryTable";
import ImportPreview from "../components/ImportPreview";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  categoryName: string | null;
  priceCents: number;
  stock: number;
}

export default function Inventory() {
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products"),
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Inventario
          </h2>
          <p className="text-on-surface-variant mt-1">
            Stock en tiempo real · <span className="text-error">rojo</span> = menos de 5 unidades
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {products.data && <InventoryTable products={products.data} />}
        <ImportPreview />
      </div>
    </div>
  );
}
