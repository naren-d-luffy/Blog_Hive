"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUserSchema = exports.changePasswordSchema = exports.userLoginSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).trim(),
    email: zod_1.z.string().email().toLowerCase().trim(),
    password: zod_1.z
        .string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
}).strict();
exports.userLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email().toLowerCase().trim(),
    password: zod_1.z.string().min(1),
}).strict();
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
}).strict();
exports.verifyUserSchema = zod_1.z.object({
    token: zod_1.z
        .string()
        .min(10, "Invalid token")
        .max(200, "Invalid token"),
});
