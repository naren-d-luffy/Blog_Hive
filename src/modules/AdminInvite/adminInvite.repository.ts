import { IAdminInvite } from "./adminInvite.interface";
import AdminInvite from "./adminInvite.model";

export const adminInviteRepository = {
  async create(inviteData: Partial<IAdminInvite>) {
    return AdminInvite.create(inviteData);
  },

  async getByToken(token: string) {
    return AdminInvite.findOne({
      token,
      expiryAt: { $gt: new Date() },
      isUsed: false,
    });
  },

  async markAsUsed(token: string) {
    return AdminInvite.updateOne(
      {
        token,
        isUsed: false,
        expiryAt: { $gt: new Date() },
      },
      {
        $set: { isUsed: true },
      },
    );
  },

  async invalidateByEmail(email: string) {
    return AdminInvite.updateMany(
      { email, isUsed: false },
      { $set: { isUsed: true } },
    );
  },
};
