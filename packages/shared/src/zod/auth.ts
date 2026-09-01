import { z } from "zod";
import { moneySchema } from "../money";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "SELLER"]).default("SELLER"),
  branchId: z.string().cuid().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["ADMIN", "MANAGER", "SELLER"]),
  branchId: z.string().nullable(),
  branchName: z.string().nullable().optional(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
});

export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UserDTO = z.infer<typeof userSchema>;

// money export for consumers that import from ./zod
export { moneySchema };
