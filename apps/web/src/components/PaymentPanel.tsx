import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../api/client";
import { useCartStore, useCartTotals, type PaymentMethod } from "../stores/cartStore";
import Money from "./Money";

interface Customer {
  id: string;
  name: string;
}

interface SaleResult {
  id: string;
  receiptId: string;
  totalCents: number;
  debtId: string | null;
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "FIADO", label: "Fiado" },
];

export default function PaymentPanel({ onSuccess }: { onSuccess: (sale: SaleResult) => void }) {
  const items = useCartStore((s) => s.items);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const customerId = useCartStore((s) => s.customerId);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const discountType = useCartStore((s) => s.discountType);
  const discountValue = useCartStore((s) => s.discountValue);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clear = useCartStore((s) => s.clear);
  const { totalCents } = useCartTotals();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<Customer[]>("/customers"),
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<SaleResult>("/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: paymentMethod === "FIADO" ? customerId : null,
          items: items.map((i) => ({
            variantId: i.variantId,
            qty: i.qty,
            unitPriceCents: i.unitPriceCents,
          })),
          payment: {
            method: paymentMethod,
            amountCents: totalCents,
            discountCents: 0,
          },
          discount: discountType ? { type: discountType, value: discountValue } : null,
        }),
      });
    },
    onSuccess: (sale) => {
      clear();
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess(sale);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Error al registrar la venta");
    },
  });

  const canCheckout = items.length > 0 && !(paymentMethod === "FIADO" && !customerId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">
          Método de pago
        </label>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setPaymentMethod(m.value)}
              className={`h-touch-target rounded border font-label-caps text-label-caps transition-colors ${
                paymentMethod === m.value
                  ? "bg-primary-container text-on-primary-container border-primary"
                  : "border-outline-variant text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === "FIADO" && (
        <div>
          <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">
            Cliente (obligatorio para fiado)
          </label>
          <select
            className="input-field"
            value={customerId ?? ""}
            onChange={(e) => setCustomer(e.target.value || null)}
          >
            <option value="">Seleccionar cliente…</option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-label-caps font-label-caps text-on-surface-variant">Descuento</label>
        <select
          className="input-field flex-1"
          value={discountType ?? ""}
          onChange={(e) =>
            setDiscount(e.target.value === "percent" || e.target.value === "fixed" ? (e.target.value as "percent" | "fixed") : null, discountValue)
          }
        >
          <option value="">Sin descuento</option>
          <option value="percent">Porcentaje (%)</option>
          <option value="fixed">Monto fijo ($)</option>
        </select>
        {discountType && (
          <input
            className="input-field w-28"
            type="number"
            min={0}
            step={discountType === "fixed" ? "0.01" : "1"}
            value={discountType === "fixed" ? discountValue / 100 : discountValue}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDiscount(discountType, discountType === "fixed" ? Math.round(v * 100) : v);
            }}
          />
        )}
      </div>

      {error && (
        <p className="text-error text-body-sm" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={() => saleMutation.mutate()}
        disabled={!canCheckout || saleMutation.isPending}
        className="btn-primary w-full justify-between"
      >
        <span>{saleMutation.isPending ? "Procesando…" : "Cobrar"}</span>
        <Money value={totalCents} className="text-on-primary" />
      </button>
    </div>
  );
}
