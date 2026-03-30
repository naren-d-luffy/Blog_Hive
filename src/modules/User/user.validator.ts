import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  status: z.enum(["active", "inactive"]).optional(),
}).strict();

export const userLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;