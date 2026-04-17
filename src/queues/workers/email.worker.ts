import { Worker } from "bullmq";
import { EMAIL_JOBS } from "../email.queue";
import { emailService } from "../../modules/Notification/email.service";
import { emailTemplates } from "../../modules/Notification/email.templates";
import redisClient from "../../config/redis.config";
import connectDB from "../../config/db.config";
import { loggerService } from "../../modules/Logger/logger.service";

(async () => {
  await connectDB();
  loggerService.info("Email Worker started...");

  new Worker(
    "email-queue",
    async (job) => {
      try {
        loggerService.debug(`Processing job: ${job.name}`, { jobData: job.data });

        switch (job.name) {
          case EMAIL_JOBS.SEND_ADMIN_INVITE: {
            const { email, inviteLink } = job.data;
            const template = emailTemplates.adminInvite(inviteLink);
            await emailService.sendEmail(email, template.subject, template.html);
            break;
          }

          case EMAIL_JOBS.SEND_VERIFY_LINK: {
            const { email, verifyLink } = job.data;
            const template = emailTemplates.verifyUser(verifyLink);
            await emailService.sendEmail(email, template.subject, template.html);
            break;
          }

          case EMAIL_JOBS.SEND_WELCOME: {
            const { email, name, loginLink } = job.data;
            const template = emailTemplates.welcome(name, loginLink);
            await emailService.sendEmail(email, template.subject, template.html);
            break;
          }

          case EMAIL_JOBS.SEND_PASSWORD_RESET: {
            const { email, resetLink } = job.data;
            const template = emailTemplates.forgotPassword(resetLink);
            await emailService.sendEmail(email, template.subject, template.html);
            break;
          }

          default:
            loggerService.warn(`Unknown job: ${job.name}`);
        }
      } catch (error: any) {
        loggerService.error(`Job failed: ${job.name}`, { error: error.message, stack: error.stack });
        throw error;
      }
    },
    {
      connection: redisClient,
      concurrency: 5,
    },
  );
})();
