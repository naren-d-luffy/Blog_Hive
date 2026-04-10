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
  token: z.string().min(32,"Invalid Token"),
}).strict();

export const adminLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),

  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
}).strict();

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;