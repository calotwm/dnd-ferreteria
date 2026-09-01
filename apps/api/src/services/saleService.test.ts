import { describe, expect, it } from "vitest";
import { computeTotals } from "@dnd/shared";

describe("sale totals & discount math", () => {
  it("computes subtotal from items", () => {
    const totals = computeTotals(
      [
        { variantId: "a", qty: 2, unitPriceCents: 150 },
        { variantId: "b", qty: 1, unitPriceCents: 700 },
      ],
      null,
    );
    expect(totals.subtotalCents).toBe(1000);
    expect(totals.discountCents).toBe(0);
    expect(totals.totalCents).toBe(1000);
  });

  it("applies a percentage discount", () => {
    const totals = computeTotals([{ variantId: "a", qty: 1, unitPriceCents: 1000 }], {
      type: "percent",
      value: 10,
    });
    expect(totals.discountCents).toBe(100);
    expect(totals.totalCents).toBe(900);
  });

  it("applies a fixed discount", () => {
    const totals = computeTotals([{ variantId: "a", qty: 1, unitPriceCents: 1000 }], {
      type: "fixed",
      value: 250,
    });
    expect(totals.discountCents).toBe(250);
    expect(totals.totalCents).toBe(750);
  });

  it("caps discount at subtotal (never negative)", () => {
    const totals = computeTotals([{ variantId: "a", qty: 1, unitPriceCents: 100 }], {
      type: "fixed",
      value: 500,
    });
    expect(totals.totalCents).toBe(0);
  });

  it("handles empty discount", () => {
    const totals = computeTotals([{ variantId: "a", qty: 3, unitPriceCents: 100 }], null);
    expect(totals.totalCents).toBe(300);
  });
});
