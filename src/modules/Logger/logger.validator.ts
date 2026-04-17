import { z } from "zod";

export const logValidator = z.object({
  timestamp: z.string(),
  level: z.enum(["INFO", "WARN", "ERROR", "DEBUG"]),
  service: z.string(),
  environment: z.string(),
  
  request: z.object({
    requestId: z.string(),
    method: z.string(),
    endpoint: z.string(),
    action: z.string().nullable(),
    ip: z.string(),
  }),

  user: z.object({
    userId: z.string().nullable(),
    role: z.string().nullable(),
  }),

  response: z.object({
    statusCode: z.number(),
    success: z.boolean(),
    durationMs: z.number(),
  }),

  error: z.object({
    code: z.string().nullable(),
    message: z.string().nullable(),
    stack: z.string().nullable(),
  }).nullable(),

  metadata: z.record(z.string(), z.any()).optional(),
});

export const getLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  level: z.enum(["INFO", "WARN", "ERROR", "DEBUG"]).optional(),
  service: z.string().optional(),
  startDate: z.string().datetime().optional(), // Must be ISO
  endDate: z.string().datetime().optional(),
  keyword: z.string().optional(),
});
