import { z } from "zod";

/**
 * Money is stored as integer cents (BIGINT in Postgres). This module holds the
 * BIGINT <-> string <-> number conversions and the Zod transform that makes the
 * API contract safe to serialize over JSON (BigInt cannot be JSON.stringify'd).
 */

/** Convert integer cents (bigint/string/number) to a plain JS number. */
export function moneyCentsToNumber(value: bigint | string | number): number {
  return Number(value);
}

/** Convert a decimal currency amount (e.g. 12.34) to integer cents (1234). */
export function numberToMoneyCents(value: number): number {
  return Math.round(value * 100);
}

/** Convert integer cents to a decimal amount number (e.g. 1234 -> 12.34). */
export function moneyCentsToDecimal(value: bigint | string | number): number {
  return Number(value) / 100;
}

/** Format integer cents as a localized currency string (no symbol by default). */
export function formatMoney(
  value: bigint | string | number,
  currency = "ARS",
  locale = "es-AR",
): string {
  const amount = moneyCentsToDecimal(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Zod schema for money: accepts bigint, numeric string, or number (all in cents)
 * and normalizes to an integer number of cents. Used on API input boundaries so
 * the wire format is always a JSON-safe integer/string.
 */
export const moneySchema = z
  .union([z.bigint(), z.string(), z.number()])
  .transform((v) => Number(v))
  .refine((v) => Number.isSafeInteger(v), "Money must be a safe integer (cents)");

/** Zod schema for a non-negative money amount in cents. */
export const nonNegativeMoneySchema = moneySchema.refine((v) => v >= 0, "Money must be >= 0");

/** Schema for a positive (strictly > 0) money amount in cents. */
export const positiveMoneySchema = moneySchema.refine((v) => v > 0, "Money must be > 0");

/** Serialize any value for JSON, converting BigInt to string (Prisma BigInt gotcha). */
export function stringifyBigInt(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}

export type MoneyInput = z.input<typeof moneySchema>;
export type Money = z.output<typeof moneySchema>;
