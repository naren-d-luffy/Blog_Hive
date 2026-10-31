import mongoose, { Schema } from "mongoose";
import { IToken, TokenType } from "./token.interface";

const tokenSchema = new Schema<IToken>(
  {
    email: { type: String, lowercase: true, trim: true},
    user: { type: Schema.Types.ObjectId, ref: "User"},
    tokenHash: { type: String, required: true, unique: true},
    type: { type: String, enum: Object.values(TokenType), required: true},
    expiryAt: { type: Date, required: true},
    isUsed: { type: Boolean, default: false},
    meta: { type: Schema.Types.Mixed},
  },
  { timestamps: true }
);

tokenSchema.index({ email: 1, type: 1, isUsed: 1 });
tokenSchema.index({ user: 1, type: 1, isUsed: 1 });
tokenSchema.index({ expiryAt: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model<IToken>("Token", tokenSchema);

export default Token;