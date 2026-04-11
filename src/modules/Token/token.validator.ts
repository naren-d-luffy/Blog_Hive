import { z } from "zod";
import { TokenType } from "./token.interface";

export const createTokenSchema = z.object({
  email: z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim())
    .optional(),

  user: z.string().optional(),
  
  type: TokenType,

  meta: z.record(z.string(),z.any()).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase().trim()),
});