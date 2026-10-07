"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogsQuerySchema = exports.logValidator = void 0;
const zod_1 = require("zod");
exports.logValidator = zod_1.z.object({
    timestamp: zod_1.z.string(),
    level: zod_1.z.enum(["INFO", "WARN", "ERROR", "DEBUG"]),
    service: zod_1.z.string(),
    environment: zod_1.z.string(),
    request: zod_1.z.object({
        requestId: zod_1.z.string(),
        method: zod_1.z.string(),
        endpoint: zod_1.z.string(),
        action: zod_1.z.string().nullable(),
        ip: zod_1.z.string(),
    }),
    user: zod_1.z.object({
        userId: zod_1.z.string().nullable(),
        role: zod_1.z.string().nullable(),
    }),
    response: zod_1.z.object({
        statusCode: zod_1.z.number(),
        success: zod_1.z.boolean(),
        durationMs: zod_1.z.number(),
    }),
    error: zod_1.z.object({
        code: zod_1.z.string().nullable(),
        message: zod_1.z.string().nullable(),
        stack: zod_1.z.string().nullable(),
    }).nullable(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.getLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    level: zod_1.z.enum(["INFO", "WARN", "ERROR", "DEBUG"]).optional(),
    service: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(), // Must be ISO
    endDate: zod_1.z.string().datetime().optional(),
    keyword: zod_1.z.string().optional(),
});
