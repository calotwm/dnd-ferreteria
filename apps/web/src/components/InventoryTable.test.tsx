import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InventoryTable from "./InventoryTable";

const products = [
  {
    id: "1",
    name: "Producto normal",
    barcode: null,
    categoryName: null,
    priceCents: 100,
    stock: 5,
  },
  {
    id: "2",
    name: "Producto bajo stock",
    barcode: "123",
    categoryName: "Herramientas",
    priceCents: 200,
    stock: 4,
  },
];

describe("InventoryTable low-stock rule (<5 red)", () => {
  it("renders stock 4 in red and stock 5 normal (spec: inventory/low-stock)", () => {
    render(<InventoryTable products={products} />);

    const lowCell = screen.getByText("4");
    const normalCell = screen.getByText("5");

    expect(lowCell.className).toContain("text-error");
    expect(normalCell.className).not.toContain("text-error");
  });
});
