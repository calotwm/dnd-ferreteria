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

interface CartState {
  items: CartLine[];
  customerId: string | null;
  paymentMethod: PaymentMethod;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  addItem: (line: Omit<CartLine, "qty">) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  setCustomer: (id: string | null) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setDiscount: (type: "percent" | "fixed" | null, value: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customerId: null,
  paymentMethod: "EFECTIVO",
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

  clear: () => set({ items: [], customerId: null, discountType: null, discountValue: 0 }),

  setCustomer: (id) => set({ customerId: id }),
  setPaymentMethod: (m) => set({ paymentMethod: m }),
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
