import { describe, expect, it } from "vitest";
import { isLowStock, LOW_STOCK_THRESHOLD } from "./lowStock";

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
