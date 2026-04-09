import { Types } from "mongoose";
import { adminInviteRepository } from "./adminInvite.repository";
import { createHash } from "crypto";
import generateToken from "../../utils/generateToken";
import env from "../../config/env.config";
import { emailQueue } from "../../config/queue.config";
import { EMAIL_JOBS } from "../../queues/email.queue";

export const adminInviteService = {
  async createAdminInvite(email: string, id: Types.ObjectId) {
    const expiryAt = new Date(Date.now() + 1000 * 60 * 60);

    const inviteToken = generateToken({ prefix: "invite_" });

    const hashedInviteToken = createHash("sha256").update(inviteToken).digest("hex");

    const newAdminInvite = await adminInviteRepository.create({
      email,
      tokenHash: hashedInviteToken,
      expiryAt,
      invitedBy: id,
    });

    const inviteLink = `${env.FRONTEND_URL}/invite-accept?token=${inviteToken}`;

    await emailQueue.add(EMAIL_JOBS.SEND_ADMIN_INVITE,{
      email,
      inviteLink
    })
    
    return newAdminInvite ? true : false;
  },

  async getAdminInviteByToken(token: string) {
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const adminInvite = await adminInviteRepository.getByToken(hashedToken);
    return adminInvite? true : false;
  },

  async markInviteAsUsed(token:string){
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const adminInvite = await adminInviteRepository.markAsUsed(hashedToken);
    return adminInvite.modifiedCount > 0;
  },

  async invalidateAllByEmail(email:string){
    const adminInvite = await adminInviteRepository.invalidateByEmail(email);
    return adminInvite.modifiedCount > 0;
  }
};
