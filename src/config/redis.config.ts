import IORedis, { RedisOptions } from "ioredis";
import env from "./env.config";

const sharedOptions: RedisOptions = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (times > 10) {
      console.error("Redis retry attempts exhausted.");
      return null;
    }
    return Math.min(times * 500, 5000);
  },
};

function createRedisClient(): IORedis {
  if (env.REDIS_URL) {
    // URL mode
    return new IORedis(env.REDIS_URL, sharedOptions);
  }

  // Host/port mode — local Redis
  return new IORedis({
    host: env.REDIS_HOST ?? "127.0.0.1",
    port: Number(env.REDIS_PORT ?? 6379),
    ...sharedOptions,
  });
}

export const redisClient = createRedisClient();

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("ready", () => console.log("Redis ready"));
redisClient.on("reconnecting", () => console.log("Redis reconnecting..."));
redisClient.on("error", (err) => console.error("Redis error:", err));

export async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }
}