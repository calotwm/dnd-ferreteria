export interface SaleItemInput {
  variantId: string;
  qty: number;
  unitPriceCents: number;
}

export interface SaleDiscount {
  type: "percent" | "fixed";
  value: number;
}

export interface ComputedTotals {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

/** Pure total/discount math shared by the POS cart (web) and the sale service (api).
 *  Discount value: `percent` = percentage (0-100); `fixed` = integer cents. */
export function computeTotals(
  items: SaleItemInput[],
  discount: SaleDiscount | null,
): ComputedTotals {
  const subtotalCents = items.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
  let discountCents = 0;
  if (discount) {
    discountCents =
      discount.type === "percent"
        ? Math.round((subtotalCents * discount.value) / 100)
        : Math.round(discount.value);
  }
  discountCents = Math.min(discountCents, subtotalCents);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}
