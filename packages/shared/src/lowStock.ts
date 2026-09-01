/** Low-stock threshold: stock below 5 units renders red (verbatim from spec). */
export const LOW_STOCK_THRESHOLD = 5;

export function isLowStock(stock: number): boolean {
  return stock < LOW_STOCK_THRESHOLD;
}

/**
 * True only when stock crosses from >= threshold to < threshold in a single
 * mutation (e.g. a sale takes 5→4). Emits the low-stock event only on that
 * crossing — never per-unit while already below (spec: platform/low-stock).
 */
export function crossedBelowThreshold(
  before: number,
  after: number,
  threshold: number = LOW_STOCK_THRESHOLD,
): boolean {
  return before >= threshold && after < threshold;
}
