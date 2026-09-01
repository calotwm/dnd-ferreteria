import * as XLSX from "xlsx";
import { formatMoney } from "@dnd/shared";

export interface InventoryExportItem {
  name: string;
  barcode: string | null;
  categoryName: string | null;
  costCents: bigint | number;
  priceCents: bigint | number;
  stock: number;
}

/** Spanish headers, verbatim from spec (inventory/excel-export). */
const HEADERS = ["nombre", "codigo_barras", "categoría", "costo", "precio", "stock"];

/**
 * Build the inventory xlsx. Uses `aoa_to_sheet([headers, ...rows])` so an empty
 * product list still yields a headers-only sheet (json_to_sheet([]) drops them).
 * Money is converted from integer cents to currency-safe strings.
 */
export function buildInventoryExportXlsx(items: InventoryExportItem[]): Buffer {
  const rows = items.map((i) => [
    i.name,
    i.barcode ?? "",
    i.categoryName ?? "",
    formatMoney(i.costCents, "ARS", "es-AR"),
    formatMoney(i.priceCents, "ARS", "es-AR"),
    i.stock,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
