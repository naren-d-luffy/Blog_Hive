import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({quiet:true});

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DB_URL: z.string().min(1, "DB URL is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid ENV variables:", parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export type Env = typeof env;

export default env;