"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config({
    path: process.env.MCP_ENV_FILE || ".env",
    quiet: true,
});
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default("3000").transform(Number),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    DB_URL: zod_1.z.string().min(1, "DB URL is required"),
    ACCESS_TOKEN: zod_1.z.string().min(32, "Access Token should be 32 characters long"),
    REFRESH_TOKEN: zod_1.z.string().min(32, "Refresh Token should be 32 characters long"),
    HASH_TOKEN: zod_1.z.string().min(32, "Hash Token should be 32 characters long"),
    LOGIN_FAILURE_COUNT: zod_1.z.coerce.number().min(1).default(3),
    LOCK_UNTIL_TIME: zod_1.z.coerce.number().min(1).default(15),
    REDIS_HOST: zod_1.z.string().min(1, "Redis IP is required"),
    REDIS_PORT: zod_1.z.string().min(4, "Redis PORT is required"),
    LOGIN_BUCKET_CAPACITY: zod_1.z.coerce.number().min(1).default(5),
    LOGIN_BUCKET_REFILLRATE: zod_1.z.coerce.number().default(0.05),
    GLOBAL_BUCKET_CAPACITY: zod_1.z.coerce.number().min(1).default(5),
    GLOBAL_BUCKET_REFILLRATE: zod_1.z.coerce.number().default(0.1),
    MAX_SLUG_LENGTH: zod_1.z.coerce.number().min(1).default(80),
    SMTP_HOST: zod_1.z.string().min(1, "SMTP host is required"),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string().min(1, "SMTP user is required"),
    SMTP_PASS: zod_1.z.string().min(1, "SMTP password is required"),
    EMAIL_FROM: zod_1.z.string().min(1, "Email from is required"),
    FRONTEND_URL: zod_1.z.string().url("Frontend URL must be valid"),
    CORS_ORGINS: zod_1.z.string().min(1, "CORS_ORIGINS is required").transform((val) => val.split(",").map((origin) => origin.trim())),
    LOG_LEVEL: zod_1.z.string().min(1, "Log level is required"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid ENV variables:", parsed.error.format());
    process.exit(1);
}
const env = parsed.data;
exports.default = env;
