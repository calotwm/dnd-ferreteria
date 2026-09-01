import { z } from "zod";
import { moneySchema, positiveMoneySchema } from "../money";

export const paymentMethodSchema = z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "FIADO"]);

/** A single payment method + amount (canonical split-payment unit). */
export const paymentInputSchema = z.object({
  method: paymentMethodSchema,
  amountCents: moneySchema,
});

export const cartItemSchema = z.object({
  variantId: z.string().min(1),
  productName: z.string().optional(),
  qty: z.coerce.number().int().min(1),
  unitPriceCents: moneySchema,
});

export const discountSchema = z
  .object({
    type: z.enum(["percent", "fixed"]),
    value: z.number().nonnegative(),
  })
  .optional()
  .nullable();

export const createSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(cartItemSchema).min(1),
  payments: z.array(paymentInputSchema).min(1).optional(),
  // Legacy single-payment shape (kept optional for backward compatibility).
  payment: z.object({
    method: paymentMethodSchema,
    amountCents: moneySchema,
    discountCents: moneySchema.default(0),
  }).optional(),
  discount: discountSchema,
});

export const saleOutputSchema = z.object({
  id: z.string(),
  totalCents: moneySchema,
  discountCents: moneySchema,
  customerId: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      variantId: z.string(),
      productName: z.string(),
      qty: z.number().int(),
      unitPriceCents: moneySchema,
    }),
  ),
  payment: z.object({
    method: paymentMethodSchema,
    amountCents: moneySchema,
  }),
  receiptId: z.string().nullable(),
});

export const receiptSchema = z.object({
  id: z.string(),
  number: z.string(),
  saleId: z.string(),
  totalCents: moneySchema,
  createdAt: z.string(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleOutput = z.infer<typeof saleOutputSchema>;
export { positiveMoneySchema };
