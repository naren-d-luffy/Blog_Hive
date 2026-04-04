import { QueueEvents } from "bullmq";
import IORedis from "ioredis";
import env from "./env.config";

export const redisIO = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const blogQueue = new QueueEvents ("blog-queue", { connection: redisIO });

blogQueue.on("completed", ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});

blogQueue.on("failed", ({ jobId, failedReason }) => {
  console.log(`Job ${jobId} failed: ${failedReason}`);
});