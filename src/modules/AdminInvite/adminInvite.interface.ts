import { Types, Document } from "mongoose";

export interface IAdminInvite extends Document {
  email: string;
  tokenHash: string;
  expiryAt: Date;
  invitedBy: Types.ObjectId;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}