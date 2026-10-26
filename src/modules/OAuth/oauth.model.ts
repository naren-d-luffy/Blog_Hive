import mongoose, { Schema } from "mongoose";
import {
  IOAuthClient,
  IOAuthConsent,
  IOAuthRefreshToken,
} from "./oauth.interface";

// 1. OAuth Client Schema
const oauthClientSchema = new Schema<IOAuthClient>(
  {
    clientId: { type: String, required: true, unique: true, trim: true },
    clientSecretHash: { type: String, select: false },
    clientName: { type: String, required: true, trim: true },
    clientType: {
      type: String,
      enum: ["confidential", "public"],
      required: true,
      default: "confidential",
    },
    redirectUris: {
      type: [String],
      required: true,
      validate: {
        validator: (uris: string[]) => uris.length > 0,
        message: "At least one redirect URI is required",
      },
    },
    allowedScopes: {
      type: [String],
      default: ["read:profile"],
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

oauthClientSchema.index({ createdBy: 1 });

export const OAuthClient = mongoose.model<IOAuthClient>(
  "OAuthClient",
  oauthClientSchema,
);

// 2. User Consent / Grant Schema
const oauthConsentSchema = new Schema<IOAuthConsent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: String, required: true, trim: true },
    scopes: { type: [String], default: [] },
  },
  { timestamps: true },
);

oauthConsentSchema.index({ userId: 1, clientId: 1 }, { unique: true });

export const OAuthConsent = mongoose.model<IOAuthConsent>(
  "OAuthConsent",
  oauthConsentSchema,
);

// 3. OAuth Refresh Token Schema (Supports Refresh Token Rotation & Token Family)
const oauthRefreshTokenSchema = new Schema<IOAuthRefreshToken>(
  {
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scope: { type: String, required: true },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

oauthRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL


export const OAuthRefreshToken = mongoose.model<IOAuthRefreshToken>(
  "OAuthRefreshToken",
  oauthRefreshTokenSchema,
);
