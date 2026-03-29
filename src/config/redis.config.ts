import { createClient } from "redis";
import env from "./env.config";

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.log("Redis retry attempts exhausted.");
        return new Error("Retry attempts exhausted");
      }
      return retries * 1000;
    },
  },
});

redisClient.on("error", (err)=>{
    console.error("Redis error",err);
})

redisClient.on("connect", ()=>{
    console.error("Redis connected successfully");
})

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
