"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const blog_queue_1 = require("../blog.queue");
const blog_repository_1 = require("../../modules/Blog/blog.repository");
const calculatePopularity_1 = require("../../utils/calculatePopularity");
const redis_config_1 = require("../../config/redis.config");
const db_config_1 = __importDefault(require("../../config/db.config"));
const logger_service_1 = require("../../modules/Logger/logger.service");
(async () => {
    await (0, db_config_1.default)();
    logger_service_1.loggerService.info("Blog Worker started...");
    new bullmq_1.Worker("blog-queue", async (job) => {
        try {
            logger_service_1.loggerService.debug(`Processing job: ${job.name}`, { jobData: job.data });
            switch (job.name) {
                case blog_queue_1.BLOG_JOBS.INCREMENT_VIEW:
                    await blog_repository_1.blogRepository.incrementView(job.data.blogId);
                    break;
                case blog_queue_1.BLOG_JOBS.UPDATE_POPULARITY:
                    const blog = await blog_repository_1.blogRepository.findById(job.data.blogId);
                    if (!blog)
                        return;
                    const score = (0, calculatePopularity_1.calculatePopularity)(blog);
                    await blog_repository_1.blogRepository.updatePopularityScore(job.data.blogId, score);
                    break;
                case blog_queue_1.BLOG_JOBS.SEND_NOTIFICATION:
                    logger_service_1.loggerService.info("Sending Notification", job.data);
                    break;
            }
        }
        catch (error) {
            logger_service_1.loggerService.error(`Job failed: ${job.name}`, { error: error.message, stack: error.stack });
            throw error;
        }
    }, { connection: redis_config_1.redisClient, concurrency: 5 });
})();
