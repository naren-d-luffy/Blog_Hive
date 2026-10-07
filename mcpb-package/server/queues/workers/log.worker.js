"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_config_1 = require("../../config/redis.config");
const db_config_1 = __importDefault(require("../../config/db.config"));
const log_queue_1 = require("../log.queue");
const logger_model_1 = require("../../modules/Logger/logger.model");
(async () => {
    await (0, db_config_1.default)();
    console.log("Log Worker initialized with DB connected...");
    const logWorker = new bullmq_1.Worker("log-queue", async (job) => {
        if (job.name === log_queue_1.LOG_JOBS.WRITE_LOG) {
            const logData = job.data;
            // Write exclusively to the log database seamlessly
            await logger_model_1.LogModel.create(logData);
        }
    }, {
        connection: redis_config_1.redisClient,
        concurrency: 10
    });
    logWorker.on("completed", () => { });
    logWorker.on("failed", (job, err) => {
        console.error(`[LOG WORKER FATAL] Job ${job?.id} failed:`, err);
    });
})();
