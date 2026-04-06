import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import env from "./env.config";

export const redisIO = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const blogQueue = new Queue("blog-queue", {
  connection: redisIO,
});

export const blogQueueEvents = new QueueEvents("blog-queue", {
  connection: redisIO,
});

blogQueueEvents.on("completed", ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});

blogQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`Job ${jobId} failed: ${failedReason}`);
});