"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordSchema = exports.createTokenSchema = void 0;
const zod_1 = require("zod");
const token_interface_1 = require("./token.interface");
exports.createTokenSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email()
        .transform((val) => val.toLowerCase().trim())
        .optional(),
    user: zod_1.z.string().optional(),
    type: token_interface_1.TokenType,
    meta: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email().transform(v => v.toLowerCase().trim()),
});
