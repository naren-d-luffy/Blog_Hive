import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DB_URL: z.string().min(1, "DB URL is required"),
  ACCESS_TOKEN: z.string().min(32, "Access Token should be 32 characters long"),
  REFRESH_TOKEN: z.string().min(32, "Refresh Token should be 32 characters long"),
  LOGIN_FAILURE_COUNT: z.coerce.number().min(1).default(3),
  LOCK_UNTIL_TIME: z.coerce.number().min(1).default(15),
  REDIS_URL: z.string().min(1, "Redis URL is required"),
  LOGIN_BUCKET_CAPACITY : z.coerce.number().min(1).default(5),
  LOGIN_BUCKET_REFILLRATE : z.coerce.number().default(0.05),
  GLOBAL_BUCKET_CAPACITY : z.coerce.number().min(1).default(5),
  GLOBAL_BUCKET_REFILLRATE : z.coerce.number().default(0.1),
  MAX_SLUG_LENGTH : z.coerce.number().min(1).default(80),
  SMTP_HOST: z.string().min(1, "SMTP host is required"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1, "SMTP user is required"),
  SMTP_PASS: z.string().min(1, "SMTP password is required"),
  EMAIL_FROM: z.string().min(1, "Email from is required"),
  FRONTEND_URL: z.string().url("Frontend URL must be valid"),
  CORS_ORGINS : z.string().min(1, "CORS_ORIGINS is required").transform((val)=>val.split(",").map((origin)=>origin.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid ENV variables:", parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export type Env = typeof env;

export default env;
