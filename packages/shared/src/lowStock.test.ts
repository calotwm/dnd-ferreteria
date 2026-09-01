import { describe, expect, it } from "vitest";
import { isLowStock, crossedBelowThreshold, LOW_STOCK_THRESHOLD } from "./lowStock";

describe("low-stock rule (threshold <5)", () => {
  it("flags stock 4 as low (red)", () => {
    expect(isLowStock(4)).toBe(true);
  });

  it("treats stock 5 as normal (not red)", () => {
    expect(isLowStock(5)).toBe(false);
  });

  it("treats stock 0 as low", () => {
    expect(isLowStock(0)).toBe(true);
  });

  it("keeps threshold verbatim at 5", () => {
    expect(LOW_STOCK_THRESHOLD).toBe(5);
  });
});

describe("low-stock crossing rule (emit only on downward crossing)", () => {
  it("crosses when stock goes 5 → 4", () => {
    expect(crossedBelowThreshold(5, 4)).toBe(true);
  });

  it("does not cross when already below (3 → 2)", () => {
    expect(crossedBelowThreshold(3, 2)).toBe(false);
  });

  it("does not cross when staying at threshold (5 → 5)", () => {
    expect(crossedBelowThreshold(5, 5)).toBe(false);
  });

  it("does not cross on an increase (4 → 5)", () => {
    expect(crossedBelowThreshold(4, 5)).toBe(false);
  });
});
