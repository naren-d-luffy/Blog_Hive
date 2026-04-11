import { Worker } from "bullmq";
import { EMAIL_JOBS } from "../email.queue";
import { emailService } from "../../modules/Notification/email.service";
import { emailTemplates } from "../../modules/Notification/email.templates";
import { redisIO } from "../../config/queue.config";
import connectDB from "../../config/db.config";

(async () => {
  await connectDB();
  console.log("Email Worker started...");

  new Worker(
    "email-queue",
    async (job) => {
      try {
        console.log("Processing job:", job.name, job.data);

        switch (job.name) {
          case EMAIL_JOBS.SEND_ADMIN_INVITE: {
            const { email, inviteLink } = job.data;

            const template = emailTemplates.adminInvite(inviteLink);

            await emailService.sendEmail(
              email,
              template.subject,
              template.html,
            );

            break;
          }

          case EMAIL_JOBS.SEND_OTP: {
            const { email, otp } = job.data;

            const template = emailTemplates.otp(otp);

            await emailService.sendEmail(
              email,
              template.subject,
              template.html,
            );

            break;
          }

          case EMAIL_JOBS.SEND_WELCOME: {
            const {email, name, loginLink} = job.data;

            const template = emailTemplates.welcome(name, loginLink);

            await emailService.sendEmail(
              email,
              template.subject,
              template.html,
            );
            break;
          }

          case EMAIL_JOBS.SEND_PASSWORD_RESET: {
            const {email, resetLink} = job.data;

            const template = emailTemplates.forgotPassword(resetLink);

            await emailService.sendEmail(
              email,
              template.subject,
              template.html,
            );

            break;
          }

          default:
            console.warn(`Unknown job: ${job.name}`);
        }
      } catch (error) {
        console.error("Job failed:", job.name, error);
        throw error;
      }
    },
    {
      connection: redisIO,
      concurrency: 5,
    },
  );
})();
