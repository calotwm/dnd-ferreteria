/** Low-stock threshold: stock below 5 units renders red (verbatim from spec). */
export const LOW_STOCK_THRESHOLD = 5;

export function isLowStock(stock: number): boolean {
  return stock < LOW_STOCK_THRESHOLD;
}
