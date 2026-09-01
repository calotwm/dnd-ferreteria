import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../api/client";
import {
  useCartStore,
  useCartTotals,
  useRemainingCents,
  type PaymentMethod,
} from "../stores/cartStore";
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
  const payments = useCartStore((s) => s.payments);
  const addPayment = useCartStore((s) => s.addPayment);
  const removePayment = useCartStore((s) => s.removePayment);
  const updatePayment = useCartStore((s) => s.updatePayment);
  const customerId = useCartStore((s) => s.customerId);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const discountType = useCartStore((s) => s.discountType);
  const discountValue = useCartStore((s) => s.discountValue);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clear = useCartStore((s) => s.clear);
  const { totalCents } = useCartTotals();
  const remainingCents = useRemainingCents();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<Customer[]>("/customers"),
  });

  // Default: ONE efectivo row covering the full total.
  useEffect(() => {
    if (items.length > 0 && payments.length === 0) {
      addPayment("EFECTIVO", totalCents);
    }
  }, [items.length, payments.length, totalCents, addPayment]);

  // Keep the single default EFECTIVO row synced to the cart total, so multi-item
  // cash sales stay correct without manual edits (stops once the user splits).
  useEffect(() => {
    if (
      payments.length === 1 &&
      payments[0].method === "EFECTIVO" &&
      payments[0].amountCents !== totalCents
    ) {
      updatePayment(0, "amountCents", totalCents);
    }
  }, [payments, totalCents, updatePayment]);

  const hasFiado = payments.some((p) => p.method === "FIADO");

  const saleMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<SaleResult>("/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: hasFiado ? customerId : null,
          items: items.map((i) => ({
            variantId: i.variantId,
            qty: i.qty,
            unitPriceCents: i.unitPriceCents,
          })),
          payments: payments.map((p) => ({ method: p.method, amountCents: p.amountCents })),
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

  const canCheckout =
    items.length > 0 &&
    payments.length > 0 &&
    remainingCents === 0 &&
    !(hasFiado && !customerId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-label-caps font-label-caps text-on-surface-variant">Pagos</label>
          <button
            type="button"
            onClick={() => addPayment("EFECTIVO", 0)}
            className="text-primary text-label-caps font-label-caps flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Agregar pago
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {payments.map((p, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                className="input-field flex-1"
                value={p.method}
                onChange={(e) => updatePayment(index, "method", e.target.value as PaymentMethod)}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                className="input-field w-28 text-right"
                type="number"
                min={0}
                step="0.01"
                value={p.amountCents / 100}
                onChange={(e) =>
                  updatePayment(index, "amountCents", Math.round(Number(e.target.value) * 100))
                }
              />
              <button
                type="button"
                onClick={() => removePayment(index)}
                className="h-8 w-8 rounded text-on-surface-variant hover:text-error"
                aria-label="Quitar pago"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-body-sm mt-2">
          <span className="text-on-surface-variant">Restante</span>
          <span
            className={
              remainingCents !== 0
                ? "text-error font-data-mono"
                : "text-on-surface font-data-mono"
            }
          >
            <Money value={remainingCents} />
          </span>
        </div>
      </div>

      {hasFiado && (
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
            setDiscount(
              e.target.value === "percent" || e.target.value === "fixed"
                ? (e.target.value as "percent" | "fixed")
                : null,
              discountValue,
            )
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
