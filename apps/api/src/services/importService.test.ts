import { describe, expect, it } from "vitest";
import { normalizeImportRows } from "./importService";

describe("Excel import validation", () => {
  it("imports valid rows", () => {
    const { rows, errors } = normalizeImportRows([
      { nombre: "Martillo", codigo_barras: "123", costo: 1000, precio: 2000, categoria: "Herramientas", stock: 5 },
      { nombre: "Clavos", codigo_barras: "456", costo: 50, precio: 150, categoria: null, stock: 0 },
    ]);
    expect(rows).toHaveLength(2);
    expect(errors).toHaveLength(0);
    expect(rows[0].nombre).toBe("Martillo");
  });

  it("skips rows missing nombre with a warning (spec: inventory/Excel import)", () => {
    const { rows, errors } = normalizeImportRows([
      { nombre: "Tornillos", codigo_barras: "789", costo: 10, precio: 20, stock: 10 },
      { nombre: "", codigo_barras: "999", costo: 5, precio: 10, stock: 3 },
    ]);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3); // header + index
  });

  it("defaults missing money and stock to zero", () => {
    const { rows } = normalizeImportRows([{ nombre: "Solo nombre" }]);
    expect(rows[0].costo).toBe(0);
    expect(rows[0].precio).toBe(0);
    expect(rows[0].stock).toBe(0);
  });
});
