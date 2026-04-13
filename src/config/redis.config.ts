import IORedis from "ioredis";
import env from "./env.config";

const redisClient = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error("Redis retry attempts exhausted");
      return null;
    }
    return times * 1000;
  },
});

redisClient.on("error", (err) => console.error("Redis error", err));
redisClient.on("connect", () => console.log("Redis connected successfully"));
redisClient.on("reconnecting", () => console.error("Redis reconnecting..."));

export default redisClient;