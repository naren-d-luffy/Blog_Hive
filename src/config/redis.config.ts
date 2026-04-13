import IORedis from "ioredis";
import env from "./env.config";

export const redisClient = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error("Redis retry attempts exhausted");
      return null;
    }
    return times * 1000;
  },
});

redisClient.on("error", (err) => {
  console.error("Redis error", err);
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("reconnecting", ()=>{
    console.error("Redis reconnecting...");
})

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Error Connecting Redis", error);
    process.exit(1);
  }
};

export default redisClient;
