"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_config_1 = __importDefault(require("./env.config"));
exports.transporter = nodemailer_1.default.createTransport({
    host: env_config_1.default.SMTP_HOST,
    port: env_config_1.default.SMTP_PORT,
    secure: env_config_1.default.SMTP_PORT.toString() === "465",
    auth: {
        user: env_config_1.default.SMTP_USER,
        pass: env_config_1.default.SMTP_PASS
    }
});
