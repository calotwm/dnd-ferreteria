import { describe, expect, it } from "vitest";
import { validatePaymentsSum } from "./totals";

describe("validatePaymentsSum", () => {
  it("passes when the payments sum equals the total", () => {
    const result = validatePaymentsSum(
      [{ amountCents: 6000 }, { amountCents: 4000 }],
      10000,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects when the payments sum does not equal the total", () => {
    const result = validatePaymentsSum([{ amountCents: 6000 }], 10000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("does not equal");
  });

  it("rejects non-integer cents", () => {
    const result = validatePaymentsSum([{ amountCents: 6000.5 }], 6000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("integer");
  });

  it("rejects an empty payments list for a non-zero total", () => {
    const result = validatePaymentsSum([], 1000);
    expect(result.ok).toBe(false);
  });
});
