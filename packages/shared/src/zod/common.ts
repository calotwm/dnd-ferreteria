import { z } from "zod";

export const idSchema = z.string().min(1);

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
});

export const periodSchema = z.enum(["day", "week", "month"]);

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type Period = z.infer<typeof periodSchema>;
