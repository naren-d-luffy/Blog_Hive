"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const email_queue_1 = require("../email.queue");
const email_service_1 = require("../../modules/Notification/email.service");
const email_templates_1 = require("../../modules/Notification/email.templates");
const redis_config_1 = require("../../config/redis.config");
const db_config_1 = __importDefault(require("../../config/db.config"));
const logger_service_1 = require("../../modules/Logger/logger.service");
(async () => {
    await (0, db_config_1.default)();
    logger_service_1.loggerService.info("Email Worker started...");
    new bullmq_1.Worker("email-queue", async (job) => {
        try {
            logger_service_1.loggerService.debug(`Processing job: ${job.name}`, { jobData: job.data });
            switch (job.name) {
                case email_queue_1.EMAIL_JOBS.SEND_ADMIN_INVITE: {
                    const { email, inviteLink } = job.data;
                    const template = email_templates_1.emailTemplates.adminInvite(inviteLink);
                    await email_service_1.emailService.sendEmail(email, template.subject, template.html);
                    break;
                }
                case email_queue_1.EMAIL_JOBS.SEND_VERIFY_LINK: {
                    const { email, verifyLink } = job.data;
                    const template = email_templates_1.emailTemplates.verifyUser(verifyLink);
                    await email_service_1.emailService.sendEmail(email, template.subject, template.html);
                    break;
                }
                case email_queue_1.EMAIL_JOBS.SEND_WELCOME: {
                    const { email, name, loginLink } = job.data;
                    const template = email_templates_1.emailTemplates.welcome(name, loginLink);
                    await email_service_1.emailService.sendEmail(email, template.subject, template.html);
                    break;
                }
                case email_queue_1.EMAIL_JOBS.SEND_PASSWORD_RESET: {
                    const { email, resetLink } = job.data;
                    const template = email_templates_1.emailTemplates.forgotPassword(resetLink);
                    await email_service_1.emailService.sendEmail(email, template.subject, template.html);
                    break;
                }
                default:
                    logger_service_1.loggerService.warn(`Unknown job: ${job.name}`);
            }
        }
        catch (error) {
            logger_service_1.loggerService.error(`Job failed: ${job.name}`, { error: error.message, stack: error.stack });
            throw error;
        }
    }, {
        connection: redis_config_1.redisClient,
        concurrency: 5,
    });
})();
