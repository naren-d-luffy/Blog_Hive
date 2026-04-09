import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import env from "./env.config";

export const redisIO = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// ---------------- BLOG QUEUE ----------------
export const blogQueue = new Queue("blog-queue", {
  connection: redisIO,
});

export const blogQueueEvents = new QueueEvents("blog-queue", {
  connection: redisIO,
});

// ---------------- EMAIL QUEUE ----------------
export const emailQueue = new Queue("email-queue", {
  connection: redisIO,
});

export const emailQueueEvents = new QueueEvents("email-queue", {
  connection: redisIO,
});

// ---------------- EVENTS ----------------
blogQueueEvents.on("completed", ({ jobId }) => {
  console.log(`[BLOG] Job ${jobId} completed`);
});

blogQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`[BLOG] Job ${jobId} failed: ${failedReason}`);
});

emailQueueEvents.on("completed", ({ jobId }) => {
  console.log(`[EMAIL] Job ${jobId} completed`);
});

emailQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`[EMAIL] Job ${jobId} failed: ${failedReason}`);
});