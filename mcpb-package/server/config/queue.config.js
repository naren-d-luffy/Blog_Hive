"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logQueueEvents = exports.logQueue = exports.emailQueueEvents = exports.emailQueue = exports.blogQueueEvents = exports.blogQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_config_1 = require("./redis.config");
// ---------------- BLOG QUEUE ----------------
exports.blogQueue = new bullmq_1.Queue("blog-queue", {
    connection: redis_config_1.redisClient,
});
exports.blogQueueEvents = new bullmq_1.QueueEvents("blog-queue", {
    connection: redis_config_1.redisClient,
});
// ---------------- EMAIL QUEUE ----------------
exports.emailQueue = new bullmq_1.Queue("email-queue", {
    connection: redis_config_1.redisClient,
});
exports.emailQueueEvents = new bullmq_1.QueueEvents("email-queue", {
    connection: redis_config_1.redisClient,
});
// ---------------- LOG QUEUE ----------------
exports.logQueue = new bullmq_1.Queue("log-queue", {
    connection: redis_config_1.redisClient,
});
exports.logQueueEvents = new bullmq_1.QueueEvents("log-queue", {
    connection: redis_config_1.redisClient,
});
// ---------------- EVENTS ----------------
exports.blogQueueEvents.on("completed", ({ jobId }) => {
    console.log(`[BLOG] Job ${jobId} completed`);
});
exports.blogQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.log(`[BLOG] Job ${jobId} failed: ${failedReason}`);
});
exports.emailQueueEvents.on("completed", ({ jobId }) => {
    console.log(`[EMAIL] Job ${jobId} completed`);
});
exports.emailQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.log(`[EMAIL] Job ${jobId} failed: ${failedReason}`);
});
exports.logQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.log(`[LOG] Job ${jobId} failed: ${failedReason}`);
});
