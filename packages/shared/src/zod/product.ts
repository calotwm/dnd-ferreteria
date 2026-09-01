import { z } from "zod";
import { moneySchema } from "../money";

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
});

export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  priceCents: moneySchema.default(0),
  costCents: moneySchema.default(0),
  stock: z.coerce.number().int().min(0).default(0),
});

export const productInputSchema = z.object({
  name: z.string().min(1).max(200),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  costCents: moneySchema.default(0),
  priceCents: moneySchema.default(0),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  variants: z.array(variantInputSchema).optional(),
});

export const productSearchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const productOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  barcode: z.string().nullable(),
  description: z.string().nullable(),
  costCents: moneySchema,
  priceCents: moneySchema,
  stock: z.number().int(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable().optional(),
  imageUrl: z.string().nullable(),
  active: z.boolean(),
  variants: z.array(
    z.object({
      id: z.string(),
      sku: z.string().nullable(),
      barcode: z.string().nullable(),
      priceCents: moneySchema,
      costCents: moneySchema,
      stock: z.number().int(),
    }),
  ),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type ProductOutput = z.infer<typeof productOutputSchema>;
