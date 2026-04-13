import { Queue, QueueEvents } from "bullmq";
import redisClient from "./redis.config";

// ---------------- BLOG QUEUE ----------------
export const blogQueue = new Queue("blog-queue", {
  connection: redisClient,
});

export const blogQueueEvents = new QueueEvents("blog-queue", {
  connection: redisClient,
});

// ---------------- EMAIL QUEUE ----------------
export const emailQueue = new Queue("email-queue", {
  connection: redisClient,
});

export const emailQueueEvents = new QueueEvents("email-queue", {
  connection: redisClient,
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