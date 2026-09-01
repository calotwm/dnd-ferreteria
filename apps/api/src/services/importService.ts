import { importRowSchema, type ImportRow } from "@dnd/shared";

export interface ImportError {
  row: number;
  reason: string;
}

/**
 * Normalize raw Excel rows (already sheet_to_json'd) into validated ImportRows.
 * Rows missing `nombre` (or otherwise invalid) are skipped with a warning.
 * Pure function — unit tested without a database.
 */
export function normalizeImportRows(raw: Array<Record<string, unknown>>): {
  rows: ImportRow[];
  errors: ImportError[];
} {
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];

  raw.forEach((record, index) => {
    // Excel header row is consumed by sheet_to_json; index 0 is the first data row.
    const rowNumber = index + 2; // 1-based + header
    const parsed = importRowSchema.safeParse({
      nombre: record["nombre"],
      codigo_barras: record["codigo_barras"] ?? record["codigo de barras"] ?? null,
      costo: record["costo"] ?? record["costo_cents"] ?? 0,
      precio: record["precio"] ?? record["precio_cents"] ?? 0,
      categoria: record["categoria"] ?? null,
      stock: record["stock"] ?? 0,
    });

    if (!parsed.success) {
      const reason = parsed.error.issues.map((i) => i.message).join(", ") || "invalid row";
      errors.push({ row: rowNumber, reason });
      return;
    }
    rows.push(parsed.data);
  });

  return { rows, errors };
}
