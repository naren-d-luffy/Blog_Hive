import { Types } from "mongoose";
import { IAdminInvite } from "./adminInvite.interface";
import { adminInviteRepository } from "./adminInvite.repository";
import { createHash } from "crypto";
import generateToken from "../../utils/generateToken";

export const adminInviteService = {
  async createAdminInvite(email: string, id: Types.ObjectId) {
    const expiryAt = new Date(Date.now() + 1000 * 60 * 60);

    const inviteToken = generateToken({ prefix: "invite_" });
    
    const hashedInviteToken = createHash("sha256")
      .update(inviteToken)
      .digest("hex");
    
      const newAdminInvite = await adminInviteRepository.create({
      email,
      tokenHash: hashedInviteToken,
      expiryAt,
      invitedBy: id,
    });
  },
};
