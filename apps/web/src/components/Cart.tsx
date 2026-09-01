import { useCartStore, useCartTotals } from "../stores/cartStore";
import Money from "./Money";

export default function Cart() {
  const items = useCartStore((s) => s.items);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const removeItem = useCartStore((s) => s.removeItem);
  const { subtotalCents, discountCents, totalCents } = useCartTotals();

  if (items.length === 0) {
    return (
      <p className="text-on-surface-variant text-body-sm py-4 text-center">
        El carrito está vacío.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-outline-variant">
        {items.map((item) => (
          <li key={item.variantId} className="py-3 flex items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-on-surface">{item.productName}</p>
              <p className="text-on-surface-variant text-body-sm">
                <Money value={item.unitPriceCents} /> × {item.qty}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => decrement(item.variantId)}
                className="h-8 w-8 rounded bg-surface-container-high text-on-surface"
                aria-label="Reducir cantidad"
              >
                −
              </button>
              <span className="w-8 text-center font-data-mono">{item.qty}</span>
              <button
                onClick={() => increment(item.variantId)}
                className="h-8 w-8 rounded bg-surface-container-high text-on-surface"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.variantId)}
                className="h-8 w-8 rounded text-on-surface-variant hover:text-error"
                aria-label="Quitar"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-outline-variant pt-3 flex flex-col gap-1">
        <div className="flex justify-between text-on-surface-variant text-body-sm">
          <span>Subtotal</span>
          <Money value={subtotalCents} />
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-on-surface-variant text-body-sm">
            <span>Descuento</span>
            <Money value={-discountCents} />
          </div>
        )}
        <div className="flex justify-between text-on-surface font-title-md">
          <span>Total</span>
          <Money value={totalCents} className="text-primary" />
        </div>
      </div>
    </div>
  );
}
