import { transporter } from "../../config/email.config";
import env from "../../config/env.config";

class EmailService {
  async sendEmail(to: string, subject: string, html: string) {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();