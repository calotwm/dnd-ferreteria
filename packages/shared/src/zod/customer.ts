import { z } from "zod";
import { moneySchema, positiveMoneySchema } from "../money";

export const customerInputSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export const abonoInputSchema = z.object({
  amountCents: positiveMoneySchema,
});

export const debtOutputSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  saleId: z.string().nullable(),
  totalCents: moneySchema,
  remainingCents: moneySchema,
  dueAt: z.string().nullable(),
  createdAt: z.string(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
export type AbonoInput = z.infer<typeof abonoInputSchema>;
