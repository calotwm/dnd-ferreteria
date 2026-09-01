import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./cartStore";

const reset = () =>
  useCartStore.setState({
    items: [],
    customerId: null,
    payments: [],
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

describe("POS payment rows (split payment)", () => {
  beforeEach(reset);

  it("starts with no payment rows", () => {
    expect(useCartStore.getState().payments).toHaveLength(0);
  });

  it("adds, updates and removes payment rows", () => {
    const { addPayment, updatePayment, removePayment } = useCartStore.getState();

    addPayment("EFECTIVO", 6000);
    addPayment("TARJETA", 4000);
    expect(useCartStore.getState().payments).toHaveLength(2);

    updatePayment(0, "amountCents", 6500);
    expect(useCartStore.getState().payments[0].amountCents).toBe(6500);

    updatePayment(1, "method", "TRANSFERENCIA");
    expect(useCartStore.getState().payments[1].method).toBe("TRANSFERENCIA");

    removePayment(0);
    expect(useCartStore.getState().payments).toHaveLength(1);
  });

  it("clears payments with the cart", () => {
    useCartStore.getState().addPayment("EFECTIVO", 1000);
    useCartStore.getState().clear();
    expect(useCartStore.getState().payments).toHaveLength(0);
  });
});
