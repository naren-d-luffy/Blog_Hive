"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
const mongoose_1 = require("mongoose");
const token_repository_1 = require("./token.repository");
const crypto_1 = require("crypto");
const bcrypt_1 = __importDefault(require("bcrypt"));
const generateToken_1 = require("../../utils/generateToken");
const env_config_1 = __importDefault(require("../../config/env.config"));
const queue_config_1 = require("../../config/queue.config");
const email_queue_1 = require("../../queues/email.queue");
const token_interface_1 = require("./token.interface");
const admin_repository_1 = require("../Admin/admin.repository");
const hashToken = (token) => (0, crypto_1.createHash)("sha256").update(token).digest("hex");
exports.tokenService = {
    async createAdminInvite(email, adminId) {
        const expiryAt = new Date(Date.now() + 1000 * 60 * 60);
        const rawToken = (0, generateToken_1.generateToken)({ prefix: "invite_" });
        const tokenHash = hashToken(rawToken);
        await token_repository_1.tokenRepository.invalidateByEmail(email, token_interface_1.TokenType.ADMIN_INVITE);
        const tokenDoc = await token_repository_1.tokenRepository.create({
            email,
            tokenHash,
            type: token_interface_1.TokenType.ADMIN_INVITE,
            expiryAt,
            meta: { invitedBy: adminId },
        });
        const inviteLink = `${env_config_1.default.FRONTEND_URL}/invite-accept?token=${rawToken}`;
        await queue_config_1.emailQueue.add(email_queue_1.EMAIL_JOBS.SEND_ADMIN_INVITE, {
            email,
            inviteLink,
        });
        return !!tokenDoc;
    },
    async forgotPassword(email, type = token_interface_1.TokenType.PASSWORD_RESET) {
        const admin = await admin_repository_1.adminRepository.findByEmail(email);
        if (!admin)
            return true;
        await token_repository_1.tokenRepository.invalidateByUser(admin._id.toString(), type);
        const rawToken = (0, generateToken_1.generateToken)({ prefix: "reset_" });
        const tokenHash = hashToken(rawToken);
        const expiryAt = new Date(Date.now() + 1000 * 60 * 15);
        await token_repository_1.tokenRepository.create({
            user: admin._id,
            email: admin.email,
            tokenHash,
            type: token_interface_1.TokenType.PASSWORD_RESET,
            expiryAt,
        });
        const resetLink = `${env_config_1.default.FRONTEND_URL}/reset-password?token=${rawToken}`;
        await queue_config_1.emailQueue.add(email_queue_1.EMAIL_JOBS.SEND_PASSWORD_RESET, {
            email: admin.email,
            resetLink,
        });
        return true;
    },
    async resetPassword(token, newPassword) {
        const tokenHash = hashToken(token);
        const tokenDoc = await token_repository_1.tokenRepository.getByToken(tokenHash, token_interface_1.TokenType.PASSWORD_RESET);
        if (!tokenDoc || !tokenDoc.user) {
            throw new Error("Invalid or expired token");
        }
        const admin = await admin_repository_1.adminRepository.findById(tokenDoc.user.toString());
        if (!admin) {
            throw new Error("User not found");
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        admin.password = hashedPassword;
        await admin_repository_1.adminRepository.save(admin);
        await token_repository_1.tokenRepository.markAsUsed(tokenHash, token_interface_1.TokenType.PASSWORD_RESET);
        return true;
    },
    async verifyToken(token, type) {
        const tokenHash = hashToken(token);
        const tokenDoc = await token_repository_1.tokenRepository.getByToken(tokenHash, type);
        return tokenDoc;
    },
    async markInviteAsUsed(token) {
        const tokenHash = hashToken(token);
        const result = await token_repository_1.tokenRepository.markAsUsed(tokenHash, token_interface_1.TokenType.ADMIN_INVITE);
        return result.modifiedCount > 0;
    },
    async invalidateAllByEmail(email) {
        const result = await token_repository_1.tokenRepository.invalidateByEmail(email, token_interface_1.TokenType.ADMIN_INVITE);
        return result.modifiedCount > 0;
    },
    async createVerifyUserToken(email, userId) {
        const expiryAt = new Date(Date.now() + 1000 * 60 * 20);
        const rawToken = (0, generateToken_1.generateToken)({ prefix: "verify_" });
        const tokenHash = hashToken(rawToken);
        await token_repository_1.tokenRepository.invalidateByEmail(email, token_interface_1.TokenType.EMAIL_VERIFICATION);
        const tokenDoc = await token_repository_1.tokenRepository.create({
            email,
            user: new mongoose_1.Types.ObjectId(userId),
            tokenHash,
            type: token_interface_1.TokenType.EMAIL_VERIFICATION,
            expiryAt,
        });
        const verifyLink = `${env_config_1.default.FRONTEND_URL}/verify-email?token=${rawToken}`;
        await queue_config_1.emailQueue.add(email_queue_1.EMAIL_JOBS.SEND_VERIFY_LINK, {
            email,
            verifyLink,
        });
        return !!tokenDoc;
    },
};
