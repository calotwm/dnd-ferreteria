import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Receipt, { type ReceiptData } from "../components/Receipt";
import Money from "../components/Money";

interface Sale {
  id: string;
  totalCents: number;
  createdAt: string;
  customer: { name: string } | null;
  receipt: { id: string; number: string } | null;
}

export default function Receipts() {
  const [active, setActive] = useState<ReceiptData | null>(null);

  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: () => apiFetch<Sale[]>("/sales"),
  });

  const openReceipt = (receiptId: string) => {
    apiFetch<ReceiptData>(`/receipts/${receiptId}`).then(setActive);
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Comprobantes
          </h2>
          <p className="text-on-surface-variant mt-1">Comprobantes no fiscales</p>
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <Receipt receipt={active} />
            <button onClick={() => setActive(null)} className="btn-secondary w-full mt-2">
              Cerrar
            </button>
          </div>
        </div>
      )}

      <ul className="card divide-y divide-outline-variant">
        {sales.data?.map((s) => (
          <li key={s.id} className="px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-on-surface font-data-mono">{s.receipt?.number ?? s.id}</p>
              <p className="text-on-surface-variant text-body-sm">
                {new Date(s.createdAt).toLocaleString("es-AR")}
                {s.customer ? ` · ${s.customer.name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Money value={s.totalCents} />
              {s.receipt && (
                <button
                  onClick={() => openReceipt(s.receipt!.id)}
                  className="text-primary hover:opacity-80"
                  aria-label="Ver comprobante"
                >
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
