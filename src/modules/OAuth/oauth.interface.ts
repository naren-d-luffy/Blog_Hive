import { Types, Document } from "mongoose";

export type OAuthClientType = "confidential" | "public";

export interface IOAuthClient extends Document {
  clientId: string;
  clientSecretHash?: string;
  clientName: string;
  clientType: OAuthClientType;
  redirectUris: string[];
  allowedScopes: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthConsent extends Document {
  userId: Types.ObjectId;
  clientId: string;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthRefreshToken extends Document {
  tokenHash: string;
  familyId: string;
  clientId: string;
  userId: Types.ObjectId;
  scope: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthAuthCodePayload {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  createdAt: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface OAuthIntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  token_type?: "Bearer";
}
