import { Types, Document } from "mongoose";

export enum TokenType {
  ADMIN_INVITE = "ADMIN_INVITE",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
}

export interface IToken extends Document {
  email?: string;
  user?: Types.ObjectId;
  tokenHash: string;
  type: TokenType;
  expiryAt: Date;
  isUsed: boolean;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}