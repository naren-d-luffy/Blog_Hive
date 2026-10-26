import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { userRepository } from "../User/user.repository";
import { oauthRepository } from "./oauth.repository";
import {
  AuthorizeQueryInput,
  ConsentBodyInput,
  CreateClientInput,
  RevokeRequestInput,
  TokenRequestInput,
} from "./oauth.validator";
import {
  deriveCodeChallenge,
  generateRandomToken,
  parseBasicAuthHeader,
  sha256,
  validateRedirectUri,
  validateScopes,
  verifyCodeChallenge,
} from "./oauth.utils";
import {
  IOAuthClient,
  OAuthIntrospectionResponse,
  OAuthTokenResponse,
} from "./oauth.interface";

const ACCESS_SECRET = env.ACCESS_TOKEN;
const AUTH_CODE_TTL_SECONDS = 60; // RFC recommendation: short lived
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export const oauthService = {
  // 1. Client Registration
  async registerClient(userId: string, input: CreateClientInput) {
    const clientId = `client_${generateRandomToken(16)}`;
    let clientSecret: string | undefined;
    let clientSecretHash: string | undefined;

    if (input.clientType === "confidential") {
      clientSecret = `sec_${generateRandomToken(32)}`;
      clientSecretHash = await bcrypt.hash(clientSecret, 10);
    }

    const client = await oauthRepository.createClient({
      clientId,
      clientSecretHash,
      clientName: input.clientName,
      clientType: input.clientType,
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
      isActive: true,
      createdBy: new Types.ObjectId(userId),
    });

    return {
      clientId: client.clientId,
      clientSecret,
      clientName: client.clientName,
      clientType: client.clientType,
      redirectUris: client.redirectUris,
      allowedScopes: client.allowedScopes,
      createdAt: client.createdAt,
    };
  },

  async getClientById(clientId: string) {
    const client = await oauthRepository.findClientById(clientId);
    if (!client || !client.isActive) {
      throw new AppError("Invalid or inactive client", 400);
    }
    return client;
  },

  async listUserClients(userId: string) {
    return await oauthRepository.findClientsByCreator(userId);
  },

  // 2. Authorize Request Validation & Processing
  async validateAuthorizeRequest(query: AuthorizeQueryInput) {
    const client = await this.getClientById(query.client_id);

    // Validate redirect URI strictly (exact match)
    const isUriValid = validateRedirectUri(query.redirect_uri, client.redirectUris);
    if (!isUriValid) {
      throw new AppError(
        "Invalid redirect_uri: Must exactly match a registered URI",
        400,
      );
    }

    // Validate requested scopes against client's allowed scopes
    const scopeCheck = validateScopes(query.scope, client.allowedScopes);
    if (!scopeCheck.isValid) {
      throw new AppError(
        `Invalid scope: One or more requested scopes are not allowed for this client`,
        400,
      );
    }

    return { client, requestedScopes: scopeCheck.scopes };
  },

  async processAuthorization(
    userId: string,
    query: AuthorizeQueryInput,
    client: IOAuthClient,
    requestedScopes: string[],
  ) {
    // Check if user already consented to all requested scopes
    const existingConsent = await oauthRepository.findConsent(userId, client.clientId);
    const hasConsentedAll =
      existingConsent &&
      requestedScopes.every((s) => existingConsent.scopes.includes(s));

    if (hasConsentedAll) {
      // Issue code directly without re-prompting consent
      const code = generateRandomToken(32);
      await oauthRepository.saveAuthCode(
        code,
        {
          code,
          clientId: client.clientId,
          userId,
          redirectUri: query.redirect_uri,
          scope: query.scope,
          codeChallenge: query.code_challenge,
          codeChallengeMethod: "S256",
          createdAt: Date.now(),
        },
        AUTH_CODE_TTL_SECONDS,
      );

      const redirectUrl = new URL(query.redirect_uri);
      redirectUrl.searchParams.set("code", code);
      redirectUrl.searchParams.set("state", query.state);

      return {
        promptConsent: false,
        redirectUri: redirectUrl.toString(),
      };
    }

    // Return prompt context so frontend can render consent UI
    return {
      promptConsent: true,
      client: {
        clientId: client.clientId,
        clientName: client.clientName,
      },
      requestedScopes,
      state: query.state,
      redirectUri: query.redirect_uri,
      codeChallenge: query.code_challenge,
      codeChallengeMethod: query.code_challenge_method,
    };
  },

  // 3. User Consent Action
  async handleUserConsent(userId: string, input: ConsentBodyInput) {
    const client = await this.getClientById(input.client_id);

    const isUriValid = validateRedirectUri(input.redirect_uri, client.redirectUris);
    if (!isUriValid) {
      throw new AppError("Invalid redirect_uri", 400);
    }

    const redirectUrl = new URL(input.redirect_uri);

    if (!input.approved) {
      redirectUrl.searchParams.set("error", "access_denied");
      redirectUrl.searchParams.set("error_description", "User denied access");
      redirectUrl.searchParams.set("state", input.state);
      return { redirectUri: redirectUrl.toString() };
    }

    // Save consent for future visits
    const scopes = input.scope.trim().split(/\s+/).filter(Boolean);
    await oauthRepository.saveConsent(userId, client.clientId, scopes);

    // Generate short-lived single-use authorization code
    const code = generateRandomToken(32);
    await oauthRepository.saveAuthCode(
      code,
      {
        code,
        clientId: client.clientId,
        userId,
        redirectUri: input.redirect_uri,
        scope: input.scope,
        codeChallenge: input.code_challenge,
        codeChallengeMethod: "S256",
        createdAt: Date.now(),
      },
      AUTH_CODE_TTL_SECONDS,
    );

    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", input.state);

    return { redirectUri: redirectUrl.toString() };
  },

  // 4. Client Authentication Helper
  async authenticateClient(
    clientId?: string,
    clientSecret?: string,
    authHeader?: string,
  ): Promise<IOAuthClient> {
    let resolvedClientId = clientId;
    let resolvedSecret = clientSecret;

    // Check HTTP Basic Auth (RFC 6749 §2.3.1)
    const basicAuth = parseBasicAuthHeader(authHeader);
    if (basicAuth) {
      resolvedClientId = basicAuth.clientId;
      resolvedSecret = basicAuth.clientSecret;
    }

    if (!resolvedClientId) {
      throw new AppError("client_id is required", 401);
    }

    const client = await oauthRepository.findClientById(resolvedClientId);
    if (!client || !client.isActive) {
      throw new AppError("Invalid client credentials", 401);
    }

    if (client.clientType === "confidential") {
      if (!resolvedSecret || !client.clientSecretHash) {
        throw new AppError("client_secret is required for confidential clients", 401);
      }

      const match = await bcrypt.compare(resolvedSecret, client.clientSecretHash);
      if (!match) {
        throw new AppError("Invalid client credentials", 401);
      }
    }

    return client;
  },

  // 5. Code & Refresh Token Exchange
  async exchangeToken(
    body: TokenRequestInput,
    authHeader?: string,
  ): Promise<OAuthTokenResponse> {
    if (body.grant_type === "authorization_code") {
      const client = await this.authenticateClient(
        body.client_id,
        body.client_secret,
        authHeader,
      );

      // Consume authorization code atomically from Redis
      const payload = await oauthRepository.consumeAuthCode(body.code);

      // Replay Attack Detection (RFC 6749 §4.1.2)
      if (!payload) {
        const consumedAudit = await oauthRepository.getConsumedCodeAudit(body.code);
        if (consumedAudit) {
          // REVOKE ALL TOKENS for this user and client immediately!
          await oauthRepository.revokeAllClientTokensForUser(
            consumedAudit.clientId,
            consumedAudit.userId,
          );
          throw new AppError(
            "Security violation: Authorization code was already used. All tokens have been revoked.",
            400,
          );
        }

        throw new AppError("Invalid, expired, or already used authorization code", 400);
      }

      // Verify client match
      if (payload.clientId !== client.clientId) {
        throw new AppError("Authorization code was issued to a different client", 400);
      }

      // Verify redirect_uri match
      if (payload.redirectUri !== body.redirect_uri) {
        throw new AppError("redirect_uri does not match original request", 400);
      }

      // Verify PKCE verifier (S256)
      const pkceValid = verifyCodeChallenge(body.code_verifier, payload.codeChallenge);
      if (!pkceValid) {
        throw new AppError("PKCE verification failed: invalid code_verifier", 400);
      }

      // Retrieve user for role/status
      const user = await userRepository.findById(payload.userId);
      if (!user || user.status === "inactive" || user.isDeleted) {
        throw new AppError("User account is inactive or not found", 401);
      }

      // Mint Access Token (JWT - 1 Hour)
      const accessToken = jwt.sign(
        {
          id: user._id.toString(),
          role: user.role,
          scope: payload.scope,
          clientId: client.clientId,
        },
        ACCESS_SECRET,
        { expiresIn: "1h" },
      );

      // Mint Refresh Token with rotation family tracking (30 Days)
      const rawRefreshToken = `rt_${generateRandomToken(32)}`;
      const tokenHash = sha256(rawRefreshToken);
      const familyId = randomUUID();
      const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );

      await oauthRepository.createRefreshToken({
        tokenHash,
        familyId,
        clientId: client.clientId,
        userId: user._id,
        scope: payload.scope,
        isRevoked: false,
        expiresAt,
      });

      return {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: rawRefreshToken,
        scope: payload.scope,
      };
    }

    if (body.grant_type === "refresh_token") {
      const client = await this.authenticateClient(
        body.client_id,
        body.client_secret,
        authHeader,
      );

      const tokenHash = sha256(body.refresh_token);
      const existingToken = await oauthRepository.findRefreshTokenByHash(tokenHash);

      if (!existingToken) {
        throw new AppError("Invalid refresh token", 400);
      }

      // REUSE DETECTION: If this refresh token was already revoked, someone is replaying it!
      if (existingToken.isRevoked) {
        await oauthRepository.revokeTokenFamily(existingToken.familyId);
        throw new AppError(
          "Refresh token reuse detected. All tokens in this family have been revoked.",
          400,
        );
      }

      // Check Expiry
      if (existingToken.expiresAt.getTime() < Date.now()) {
        throw new AppError("Refresh token has expired", 400);
      }

      // Check Client
      if (existingToken.clientId !== client.clientId) {
        throw new AppError("Refresh token does not belong to this client", 400);
      }

      const user = await userRepository.findById(existingToken.userId.toString());
      if (!user || user.status === "inactive" || user.isDeleted) {
        throw new AppError("User account is inactive or not found", 401);
      }

      // Rotate: Revoke the current token
      await oauthRepository.revokeRefreshToken(tokenHash);

      // Mint new Refresh Token belonging to the SAME family
      const newRawRefreshToken = `rt_${generateRandomToken(32)}`;
      const newTokenHash = sha256(newRawRefreshToken);
      const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );

      await oauthRepository.createRefreshToken({
        tokenHash: newTokenHash,
        familyId: existingToken.familyId,
        clientId: client.clientId,
        userId: user._id,
        scope: existingToken.scope,
        isRevoked: false,
        expiresAt,
      });

      // Mint new Access Token
      const accessToken = jwt.sign(
        {
          id: user._id.toString(),
          role: user.role,
          scope: existingToken.scope,
          clientId: client.clientId,
        },
        ACCESS_SECRET,
        { expiresIn: "1h" },
      );

      return {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: newRawRefreshToken,
        scope: existingToken.scope,
      };
    }

    throw new AppError("Unsupported grant_type", 400);
  },

  // 6. Token Revocation (RFC 7009)
  async revokeToken(
    body: RevokeRequestInput,
    authHeader?: string,
  ): Promise<{ success: true }> {
    try {
      await this.authenticateClient(body.client_id, body.client_secret, authHeader);
    } catch {
      // RFC 7009 §2.2: Even if authentication fails or token invalid, return 200 to prevent user enumeration
      return { success: true };
    }

    const tokenHash = sha256(body.token);
    await oauthRepository.revokeRefreshToken(tokenHash);

    return { success: true };
  },

  // 7. Token Introspection (RFC 7662)
  async introspectToken(token: string): Promise<OAuthIntrospectionResponse> {
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
      if (typeof decoded === "object" && decoded.id) {
        return {
          active: true,
          scope: decoded.scope,
          client_id: decoded.clientId,
          sub: decoded.id,
          exp: decoded.exp,
          iat: decoded.iat,
          token_type: "Bearer",
        };
      }
    } catch {
      // Not a valid or active JWT access token; check if it's an active refresh token
      const tokenHash = sha256(token);
      const refreshDoc = await oauthRepository.findRefreshTokenByHash(tokenHash);
      if (
        refreshDoc &&
        !refreshDoc.isRevoked &&
        refreshDoc.expiresAt.getTime() > Date.now()
      ) {
        return {
          active: true,
          scope: refreshDoc.scope,
          client_id: refreshDoc.clientId,
          sub: refreshDoc.userId.toString(),
          exp: Math.floor(refreshDoc.expiresAt.getTime() / 1000),
          token_type: "Bearer",
        };
      }
    }

    return { active: false };
  },
};
