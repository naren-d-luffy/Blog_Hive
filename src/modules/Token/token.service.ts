import { Types } from "mongoose";
import { tokenRepository } from "./token.repository";
import { createHash } from "crypto";
import bcrypt from 'bcrypt';
import generateToken from "../../utils/generateToken";
import env from "../../config/env.config";
import { emailQueue } from "../../config/queue.config";
import { EMAIL_JOBS } from "../../queues/email.queue";
import { TokenType } from "./token.interface";
import { adminRepository } from "../Admin/admin.repository";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const tokenService = {
  async createAdminInvite(email: string, adminId: Types.ObjectId) {
    const expiryAt = new Date(Date.now() + 1000 * 60 * 60);

    const rawToken = generateToken({ prefix: "invite_" });
    const tokenHash = hashToken(rawToken);

    await tokenRepository.invalidateByEmail(email, TokenType.ADMIN_INVITE);

    const tokenDoc = await tokenRepository.create({
      email,
      tokenHash,
      type: TokenType.ADMIN_INVITE,
      expiryAt,
      meta: { invitedBy: adminId },
    });

    const inviteLink = `${env.FRONTEND_URL}/invite-accept?token=${rawToken}`;

    await emailQueue.add(EMAIL_JOBS.SEND_ADMIN_INVITE, {
      email,
      inviteLink,
    });

    return !!tokenDoc;
  },

  async forgotPassword(email: string,type: TokenType = TokenType.PASSWORD_RESET) {
    const admin = await adminRepository.findByEmail(email);

    if (!admin) return true;

    await tokenRepository.invalidateByUser(
      admin._id.toString(),
      type
    );

    const rawToken = generateToken({ prefix: "reset_" });
    const tokenHash = hashToken(rawToken);

    const expiryAt = new Date(Date.now() + 1000 * 60 * 15);

    await tokenRepository.create({
      user: admin._id,
      email: admin.email,
      tokenHash,
      type: TokenType.PASSWORD_RESET,
      expiryAt,
    });

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await emailQueue.add(EMAIL_JOBS.SEND_PASSWORD_RESET, {
      email: admin.email,
      resetLink,
    });

    return true;
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);

    const tokenDoc = await tokenRepository.getByToken(
      tokenHash,
      TokenType.PASSWORD_RESET
    );

    if (!tokenDoc || !tokenDoc.user) {
      throw new Error("Invalid or expired token");
    }

    const admin = await adminRepository.findById(tokenDoc.user.toString());

    if (!admin) {
      throw new Error("User not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = hashedPassword;
    await adminRepository.save(admin);

    await tokenRepository.markAsUsed(
      tokenHash,
      TokenType.PASSWORD_RESET
    );

    return true;
  },


  async verifyAdminInvite(token: string) {
    const tokenHash = hashToken(token);

    const tokenDoc = await tokenRepository.getByToken(
      tokenHash,
      TokenType.ADMIN_INVITE
    );

    return tokenDoc;
  },

  async markInviteAsUsed(token: string) {
    const tokenHash = hashToken(token);

    const result = await tokenRepository.markAsUsed(
      tokenHash,
      TokenType.ADMIN_INVITE
    );

    return result.modifiedCount > 0;
  },

  async invalidateAllByEmail(email: string) {
    const result = await tokenRepository.invalidateByEmail(
      email,
      TokenType.ADMIN_INVITE
    );

    return result.modifiedCount > 0;
  },

};