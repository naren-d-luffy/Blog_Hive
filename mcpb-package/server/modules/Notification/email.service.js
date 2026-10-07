"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const email_config_1 = require("../../config/email.config");
const env_config_1 = __importDefault(require("../../config/env.config"));
class EmailService {
    async sendEmail(to, subject, html) {
        await email_config_1.transporter.sendMail({
            from: env_config_1.default.EMAIL_FROM,
            to,
            subject,
            html,
        });
    }
}
exports.emailService = new EmailService();
