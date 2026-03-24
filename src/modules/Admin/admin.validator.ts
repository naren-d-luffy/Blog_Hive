import {z} from "zod";

export const createAdminSchema = z.object({
    name:z.string().min(2).trim(),
    email:z.string().email("Invalid Email Format").toLowerCase().trim(),
    password:z
    .string()
    .min(8,"Password must be atleast 8 characters")
    .regex(/[A-Z]/, "Password must contain atleast one Uppercase letter")
    .regex(/[a-z]/, "Password must contain atleast one Lowercase letter")
    .regex(/[0-9]/, "Password must contain atleast one Number"),
    status: z.enum(["active","inactive"]).optional(),
}).strict();

export const adminLoginSchema = z.object({
    emai: z.string().email("Invalid Email Format").toLowerCase().trim(),
    password: z.string().min(1, "Password is required")
}).strict();