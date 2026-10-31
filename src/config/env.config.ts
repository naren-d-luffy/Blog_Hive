import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const envSchema = z.object({
  // Application
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database and tokens
  DB_URL: z.string().min(1, "DB URL is required"),
  ACCESS_TOKEN: z.string().min(32, "Access Token should be 32 characters long"),
  HASH_TOKEN: z.string().min(32, "Hash Token should be 32 characters long"),

  // Authentication and rate limiting
  LOGIN_FAILURE_COUNT: z.coerce.number().min(1).default(3),
  LOCK_UNTIL_TIME: z.coerce.number().min(1).default(15),

  // Redis — provide either REDIS_URL (Upstash / remote) or REDIS_HOST + REDIS_PORT (local)
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),

  LOGIN_BUCKET_CAPACITY: z.coerce.number().min(1).default(5),
  LOGIN_BUCKET_REFILLRATE: z.coerce.number().default(0.05),
  GLOBAL_BUCKET_CAPACITY: z.coerce.number().min(1).default(5),
  GLOBAL_BUCKET_REFILLRATE: z.coerce.number().default(0.1),
  GOOGLE_BUCKET_CAPACITY: z.coerce.number().min(1).default(10),
  GOOGLE_BUCKET_REFILLRATE: z.coerce.number().default(0.05),

  MAX_SLUG_LENGTH: z.coerce.number().min(1).default(80),

  // Email
  SMTP_HOST: z.string().min(1, "SMTP host is required"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1, "SMTP user is required"),
  SMTP_PASS: z.string().min(1, "SMTP password is required"),
  EMAIL_FROM: z.string().min(1, "Email from is required"),

  // Frontend and application security
  FRONTEND_URL: z.string().url("Frontend URL must be valid"),
  CORS_ORGINS: z.string().min(1, "CORS_ORGINS is required").transform((val) => val.split(",").map((origin) => origin.trim())),
  LOG_LEVEL: z.string().min(1, "Log level is required"),

  // MCP server
  MCP_TRANSPORT: z.enum(["streamable-http", "stdio"]).default("streamable-http"),

  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MCP_HOST: z.string().min(1).default("127.0.0.1"),
  MCP_ENDPOINT: z.string().startsWith("/").default("/mcp"),

  MCP_SESSION_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1).default(30 * 60 * 1000),
  MCP_MAX_SESSIONS: z.coerce.number().int().min(1).default(1000),
  MCP_ALLOWED_HOSTS: z.string().optional().transform((val) =>  val ? val.split(",").map((host) => host.trim()).filter(Boolean) : undefined),
  MCP_ALLOWED_ORIGINS: z.string().optional().transform((val) => val ? val.split(",").map((origin) => origin.trim()).filter(Boolean) : ["*"]),
  MCP_STRICT_AUTH: z.enum(["true", "false"]).default("false").transform((val) => val === "true"),

  // Google OAuth configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_AUTH_URI: z.string().default("https://accounts.google.com/o/oauth2/v2/auth"),
  GOOGLE_TOKEN_URI: z.string().default("https://oauth2.googleapis.com/token"),
  GOOGLE_USERINFO_URI: z.string().default("https://www.googleapis.com/oauth2/v3/userinfo"),
  GOOGLE_CERTS_URI: z.string().default("https://www.googleapis.com/oauth2/v3/certs"),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  BACKEND_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid ENV variables:", parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export type Env = typeof env;

export default env;