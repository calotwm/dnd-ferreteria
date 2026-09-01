import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildInventoryExportXlsx } from "./inventoryExport";

describe("inventory Excel export", () => {
  it("returns headers-only xlsx when no products exist", () => {
    const buf = buildInventoryExportXlsx([]);
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(["nombre", "codigo_barras", "categoría", "costo", "precio", "stock"]);
  });

  it("adds one data row per product with currency-formatted cost/price", () => {
    const buf = buildInventoryExportXlsx([
      {
        name: "Martillo",
        barcode: "123",
        categoryName: "Herramientas",
        costCents: 1000,
        priceCents: 2500,
        stock: 4,
      },
    ]);
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    expect(rows).toHaveLength(2);
    const [nombre, codigo, categoria, costo, precio, stock] = rows[1] as unknown[];
    expect(nombre).toBe("Martillo");
    expect(codigo).toBe("123");
    expect(categoria).toBe("Herramientas");
    // Currency strings (cents → currency), not raw integer cents.
    expect(costo).toContain(",");
    expect(precio).toContain(",");
    expect(stock).toBe(4);
  });
});
