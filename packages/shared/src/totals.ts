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

/**
 * Validate that payment amounts are integer cents and sum EXACTLY to the
 * post-discount total. Returns a result object (no throw) so callers and unit
 * tests can branch cleanly (spec: pos/payment methods — reject mismatched sums).
 */
export function validatePaymentsSum(
  payments: Array<{ amountCents: number }>,
  totalCents: number,
): { ok: true } | { ok: false; error: string } {
  for (const p of payments) {
    if (!Number.isSafeInteger(p.amountCents)) {
      return { ok: false, error: "Payment amount must be an integer number of cents" };
    }
  }
  const sum = payments.reduce((s, p) => s + p.amountCents, 0);
  if (sum !== totalCents) {
    return { ok: false, error: `Payments sum ${sum} does not equal total ${totalCents}` };
  }
  return { ok: true };
}
