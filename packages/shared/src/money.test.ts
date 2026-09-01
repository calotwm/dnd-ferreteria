import { describe, expect, it } from "vitest";
import {
  formatMoney,
  moneyCentsToDecimal,
  moneyCentsToNumber,
  moneySchema,
  numberToMoneyCents,
  stringifyBigInt,
} from "./money";

describe("money transforms", () => {
  it("converts bigint cents to number", () => {
    expect(moneyCentsToNumber(1234n)).toBe(1234);
    expect(moneyCentsToNumber("1234")).toBe(1234);
  });

  it("converts decimal to integer cents", () => {
    expect(numberToMoneyCents(12.34)).toBe(1234);
    expect(numberToMoneyCents(0.1)).toBe(10);
  });

  it("converts cents to decimal", () => {
    expect(moneyCentsToDecimal(1234n)).toBe(12.34);
  });

  it("normalizes moneySchema input to integer number", () => {
    expect(moneySchema.parse(10n)).toBe(10);
    expect(moneySchema.parse("10")).toBe(10);
    expect(moneySchema.parse(10)).toBe(10);
  });

  it("rejects non-safe-integer money", () => {
    expect(() => moneySchema.parse(1.5)).toThrow();
  });

  it("serializes BigInt to string in JSON", () => {
    const parsed = JSON.parse(stringifyBigInt({ total: 1234n, name: "x" }));
    expect(parsed.total).toBe("1234");
    expect(parsed.name).toBe("x");
  });

  it("formats money with locale", () => {
    expect(formatMoney(1234n, "ARS", "es-AR")).toContain("12,34");
  });
});
