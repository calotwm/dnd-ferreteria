import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import ShareButton from "../components/ShareButton";
import Money from "../components/Money";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  priceCents: number;
  categoryName: string | null;
}

export default function Catalog() {
  const items = useQuery({
    queryKey: ["catalog-items"],
    queryFn: () => apiFetch<CatalogItem[]>("/catalog-items"),
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Catálogo
          </h2>
          <p className="text-on-surface-variant mt-1">Productos con fotos y precios</p>
        </div>
      </div>

      {!items.data?.length && (
        <p className="text-on-surface-variant">
          Sin productos con foto. Suba imágenes desde Inventario para construir el catálogo.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {items.data?.map((item) => (
          <div key={item.id} className="card overflow-hidden flex flex-col">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-40 object-cover bg-surface-container-high"
            />
            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3 className="font-title-md text-title-md text-on-surface">{item.name}</h3>
              {item.description && (
                <p className="text-on-surface-variant text-body-sm">{item.description}</p>
              )}
              <div className="mt-auto flex justify-between items-center">
                <Money value={item.priceCents} className="text-primary" />
                <ShareButton name={item.name} priceCents={item.priceCents} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
