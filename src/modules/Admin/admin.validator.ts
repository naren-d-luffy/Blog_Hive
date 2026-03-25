import { z } from "zod";

export const createAdminSchema = z.object({
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

export const adminLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
}).strict();

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;