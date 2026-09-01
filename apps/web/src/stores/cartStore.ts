import { create } from "zustand";
import { computeTotals } from "@dnd/shared";

export interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  qty: number;
}

export type PaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "FIADO";

export interface Payment {
  method: PaymentMethod;
  amountCents: number;
}

interface CartState {
  items: CartLine[];
  customerId: string | null;
  payments: Payment[];
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  addItem: (line: Omit<CartLine, "qty">) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  setCustomer: (id: string | null) => void;
  addPayment: (method: PaymentMethod, amountCents: number) => void;
  removePayment: (index: number) => void;
  updatePayment: (index: number, field: "method" | "amountCents", value: PaymentMethod | number) => void;
  setDiscount: (type: "percent" | "fixed" | null, value: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customerId: null,
  payments: [],
  discountType: null,
  discountValue: 0,

  addItem: (line) =>
    set((state) => {
      const existing = state.items.find((i) => i.variantId === line.variantId);
      if (existing) {
        // Scanning again increments qty (spec: pos/cart).
        return {
          items: state.items.map((i) =>
            i.variantId === line.variantId ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { ...line, qty: 1 }] };
    }),

  increment: (variantId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i,
      ),
    })),

  decrement: (variantId) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.variantId === variantId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    })),

  removeItem: (variantId) =>
    set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

  clear: () =>
    set({ items: [], customerId: null, payments: [], discountType: null, discountValue: 0 }),

  setCustomer: (id) => set({ customerId: id }),

  addPayment: (method, amountCents) =>
    set((state) => ({ payments: [...state.payments, { method, amountCents }] })),

  removePayment: (index) =>
    set((state) => ({ payments: state.payments.filter((_, i) => i !== index) })),

  updatePayment: (index, field, value) =>
    set((state) => ({
      payments: state.payments.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    })),

  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
}));

/** Derived cart totals (in cents). */
export function useCartTotals(): { subtotalCents: number; discountCents: number; totalCents: number } {
  const items = useCartStore((s) => s.items);
  const discountType = useCartStore((s) => s.discountType);
  const discountValue = useCartStore((s) => s.discountValue);

  const discount = discountType ? { type: discountType, value: discountValue } : null;
  return computeTotals(
    items.map((i) => ({ variantId: i.variantId, qty: i.qty, unitPriceCents: i.unitPriceCents })),
    discount,
  );
}

/** Remaining cents to cover: cart total minus the sum of the payment rows. */
export function useRemainingCents(): number {
  const payments = useCartStore((s) => s.payments);
  const { totalCents } = useCartTotals();
  const paid = payments.reduce((sum, p) => sum + p.amountCents, 0);
  return totalCents - paid;
}
