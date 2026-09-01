import { z } from "zod";
import { moneySchema, nonNegativeMoneySchema } from "../money";

export const expenseCategoryInputSchema = z.object({
  name: z.string().min(1).max(120),
});

export const expenseInputSchema = z.object({
  categoryId: z.string().min(1),
  amountCents: nonNegativeMoneySchema,
  note: z.string().optional().nullable(),
  spentAt: z.string().optional().nullable(),
});

export const supplierInputSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export const purchaseItemSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  costCents: moneySchema,
});

export const purchaseInputSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(purchaseItemSchema).min(1),
  note: z.string().optional().nullable(),
});

export type ExpenseCategoryInput = z.infer<typeof expenseCategoryInputSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type PurchaseInput = z.infer<typeof purchaseInputSchema>;
