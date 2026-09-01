import { z } from "zod";
import { moneySchema } from "../money";

export const openCashSessionSchema = z.object({
  openingCents: moneySchema,
});

export const closeCashSessionSchema = z.object({
  countedCents: moneySchema,
});

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
