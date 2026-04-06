import { Document, Types } from "mongoose";

export interface IAdminInvite extends Document {
    email: string,
    token: string,
    expiryAt: Date,
    invitedBy: Types.ObjectId,
    isUsed: boolean,
}