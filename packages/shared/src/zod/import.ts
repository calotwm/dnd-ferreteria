import { z } from "zod";
import { moneySchema } from "../money";

/** Excel import row (inventory): Spanish column names as per the template. */
export const importRowSchema = z.object({
  nombre: z.string().trim().min(1),
  codigo_barras: z.string().trim().optional().nullable().default(null),
  costo: moneySchema.optional().default(0),
  precio: moneySchema.optional().default(0),
  categoria: z.string().trim().optional().nullable().default(null),
  stock: z.coerce.number().int().min(0).optional().default(0),
});

export const importResultSchema = z.object({
  total: z.number().int(),
  imported: z.number().int(),
  skipped: z.number().int(),
  errors: z.array(
    z.object({
      row: z.number().int(),
      reason: z.string(),
    }),
  ),
});

export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;
