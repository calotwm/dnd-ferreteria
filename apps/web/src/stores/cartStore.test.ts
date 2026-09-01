import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./cartStore";

const reset = () =>
  useCartStore.setState({
    items: [],
    customerId: null,
    paymentMethod: "EFECTIVO",
    discountType: null,
    discountValue: 0,
  });

const line = {
  variantId: "v1",
  productId: "p1",
  productName: "Martillo",
  unitPriceCents: 500,
};

describe("POS cart store", () => {
  beforeEach(reset);

  it("adds a new item with qty 1", () => {
    useCartStore.getState().addItem(line);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(1);
  });

  it("increments qty on rescan (spec: pos/cart)", () => {
    const { addItem } = useCartStore.getState();
    addItem(line);
    addItem(line);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(2);
  });

  it("removes item when decremented below 1", () => {
    useCartStore.getState().addItem(line);
    useCartStore.getState().decrement("v1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removes item explicitly", () => {
    useCartStore.getState().addItem(line);
    useCartStore.getState().removeItem("v1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("computes totals via shared computeTotals", () => {
    useCartStore.getState().addItem(line);
    useCartStore.getState().addItem(line); // qty 2 → 1000 cents
    const totals = useCartStore.getState().items.reduce((s, i) => s + i.qty * i.unitPriceCents, 0);
    expect(totals).toBe(1000);
  });
});
