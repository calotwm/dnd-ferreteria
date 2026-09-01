import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { useCartStore } from "../stores/cartStore";
import BarcodeScanner from "../components/BarcodeScanner";
import ProductPicker from "../components/ProductPicker";
import Cart from "../components/Cart";
import PaymentPanel from "../components/PaymentPanel";
import Receipt, { type ReceiptData } from "../components/Receipt";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  priceCents: number;
  variants: Array<{ id: string; barcode: string | null; priceCents: number; stock: number }>;
}

export default function Pos() {
  const addItem = useCartStore((s) => s.addItem);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handleDetected = (barcode: string) => {
    setUnknown(null);
    apiFetch<Product[]>(`/products/search?q=${encodeURIComponent(barcode)}`)
      .then((products) => {
        const match =
          products.find((p) => p.barcode === barcode) ??
          products.find((p) => p.variants.some((v) => v.barcode === barcode));
        if (match) {
          const variant = match.variants[0];
          if (variant) {
            addItem({
              variantId: variant.id,
              productId: match.id,
              productName: match.name,
              unitPriceCents: variant.priceCents,
            });
            return;
          }
        }
        // Unknown barcode → manual-entry prompt, no error (spec: pos/cart).
        setUnknown(`Código ${barcode} no encontrado. Verifique o ingréselo manualmente.`);
      })
      .catch(() => setUnknown("Error al buscar el producto."));
  };

  const handleSaleSuccess = (sale: { receiptId: string }) => {
    apiFetch<ReceiptData>(`/receipts/${sale.receiptId}`)
      .then(setReceipt)
      .catch(() => undefined);
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
            Vender
          </h2>
          <p className="text-on-surface-variant mt-1">Punto de venta</p>
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <Receipt receipt={receipt} />
            <button onClick={() => setReceipt(null)} className="btn-secondary w-full mt-2">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {unknown && (
        <div className="card p-4 mb-4 border-error/50 text-error text-body-sm" role="alert">
          {unknown}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="flex flex-col gap-4">
          <BarcodeScanner onDetected={handleDetected} />
          <ProductPicker />
        </div>
        <div className="card p-6 flex flex-col gap-4">
          <Cart />
          <div className="border-t border-outline-variant pt-4">
            <PaymentPanel onSuccess={handleSaleSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}
