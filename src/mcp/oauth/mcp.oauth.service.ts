/**
 * MCP OAuth 2.0 Authorization Server — Core Service
 *
 * Acts as an Authorization Server that:
 *  1. Delegates identity to Google (Authorization Code + PKCE from your client app → Google)
 *  2. Issues its own short-lived JWTs to MCP clients (Claude Desktop)
 *  3. Supports refresh token rotation
 *  4. Supports token revocation (RFC 7009)
 *
 * This service is intentionally stateless — all state lives in Redis via mcp.oauth.store.ts.
 */

import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { googleAuthService } from "../../modules/GoogleAuth/google.service";
import { userRepository } from "../../modules/User/user.repository";
import {
  saveOAuthState,
  consumeOAuthState,
  issueAuthCode,
  consumeAuthCode,
  issueRefreshToken,
  lookupRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "./mcp.oauth.store";
import {
  StoredMcpOAuthState,
  OAuthTokenSuccessResponse,
  OAuthErrorCode,
  MCP_OAUTH_ACCESS_TOKEN_TTL_SEC,
  SUPPORTED_SCOPES,
} from "./mcp.oauth.types";

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function deriveCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function verifyPkceChallenge(verifier: string, storedChallenge: string): boolean {
  const derived = deriveCodeChallenge(verifier);
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(derived),
      Buffer.from(storedChallenge),
    );
  } catch {
    return false;
  }
}

// ─── Google OAuth2 client ─────────────────────────────────────────────────────

function getGoogleClient(): OAuth2Client {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    getMcpCallbackUri(),
  );
}

export function getMcpCallbackUri(): string {
  return `${env.BACKEND_URL}${env.MCP_ENDPOINT}/oauth/callback`;
}

export function getMcpIssuer(): string {
  return `${env.BACKEND_URL}${env.MCP_ENDPOINT}`;
}

// ─── Scope validation ─────────────────────────────────────────────────────────

function validateScope(requested: string): string {
  if (!requested) return "mcp:read";

  const parts = requested.trim().split(/\s+/);
  const valid = parts.filter((s) =>
    (SUPPORTED_SCOPES as readonly string[]).includes(s),
  );

  if (valid.length === 0) return "mcp:read";
  return valid.join(" ");
}

// ─── JWT issuance ─────────────────────────────────────────────────────────────

function signMcpAccessToken(
  userId: string,
  role: string,
  scope: string,
  clientId: string,
): string {
  return jwt.sign(
    {
      id: userId,
      role,
      scope,
      client_id: clientId,
      iss: getMcpIssuer(),
      aud: "mcp",
    },
    env.ACCESS_TOKEN,
    { expiresIn: MCP_OAUTH_ACCESS_TOKEN_TTL_SEC },
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Step 1 — Build the URL to which Claude Desktop should be redirected.
 *
 * We generate a PKCE pair for the Google leg, and separately store the
 * PKCE challenge that Claude Desktop sent us (for verification in step 3).
 */
export async function buildAuthorizationRedirectUrl(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
}): Promise<string> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError("Google OAuth is not configured on this server.", 500);
  }

  if (params.codeChallengeMethod !== "S256") {
    throw new OAuthError("invalid_request", "Only S256 code_challenge_method is supported.");
  }

  const validScope = validateScope(params.scope);

  // Our own PKCE for the Google leg
  const googleCodeVerifier = crypto.randomBytes(32).toString("base64url");
  const googleState = crypto.randomBytes(32).toString("hex");

  const statePayload: StoredMcpOAuthState = {
    clientId: params.clientId,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: "S256",
    redirectUri: params.redirectUri,
    scope: validScope,
    clientState: params.state,   // ← store Claude's original state to echo back
    googleCodeVerifier,
    googleState,
    createdAt: Date.now(),
  };

  // Map the Google state → our stored state (so the callback can find it)
  await saveOAuthState(googleState, statePayload);

  const googleClient = getGoogleClient();
  const googleChallenge = deriveCodeChallenge(googleCodeVerifier);

  return googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    state: googleState,
    code_challenge: googleChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: "consent",
  });
}

/**
 * Step 2 — Google callback.
 *
 * 1. Validate Google state, retrieve stored params
 * 2. Exchange Google authorization code for Google tokens
 * 3. Verify Google ID token, reconcile/create user
 * 4. Issue a short-lived opaque authorization code for the MCP client
 * 5. Return the MCP client's redirect URI with the code appended
 */
export async function handleGoogleCallback(params: {
  code: string;
  state: string;
}): Promise<{ redirectUri: string; code: string; oauthState: StoredMcpOAuthState }> {
  const storedState = await consumeOAuthState(params.state);
  if (!storedState) {
    throw new OAuthError("invalid_request", "Invalid or expired OAuth state (possible CSRF).");
  }

  // Exchange Google auth code
  const googleClient = getGoogleClient();
  let googleTokens;
  try {
    const { tokens } = await googleClient.getToken({
      code: params.code,
      codeVerifier: storedState.googleCodeVerifier,
    });
    googleTokens = tokens;
  } catch (err: any) {
    throw new OAuthError(
      "invalid_grant",
      `Failed to exchange Google authorization code: ${err.message}`,
    );
  }

  if (!googleTokens.id_token) {
    throw new OAuthError("server_error", "Google did not return an ID token.");
  }

  // Verify Google ID token + reconcile user
  const profile = await googleAuthService.verifyIdTokenPayload(googleTokens.id_token);
  const { user } = await googleAuthService.reconcileGoogleUser(profile);

  // Issue our authorization code
  const code = await issueAuthCode({
    userId: user._id.toString(),
    clientId: storedState.clientId,
    codeChallenge: storedState.codeChallenge,
    redirectUri: storedState.redirectUri,
    scope: storedState.scope,
  });

  return { redirectUri: storedState.redirectUri, code, oauthState: storedState };
}

/**
 * Step 3 — Token endpoint: authorization_code grant.
 *
 * 1. Consume the authorization code (one-time use)
 * 2. Verify PKCE code_verifier against stored code_challenge
 * 3. Verify redirect_uri matches what was registered
 * 4. Load user, issue JWT access token + opaque refresh token
 */
export async function exchangeCodeForToken(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}): Promise<OAuthTokenSuccessResponse> {
  const stored = await consumeAuthCode(params.code);
  if (!stored) {
    throw new OAuthError("invalid_grant", "Authorization code is invalid, expired, or already used.");
  }

  // Client ID must match
  if (stored.clientId !== params.clientId) {
    throw new OAuthError("invalid_client", "client_id mismatch.");
  }

  // Redirect URI must match exactly
  if (stored.redirectUri !== params.redirectUri) {
    throw new OAuthError("invalid_grant", "redirect_uri mismatch.");
  }

  // PKCE verification
  if (!verifyPkceChallenge(params.codeVerifier, stored.codeChallenge)) {
    throw new OAuthError("invalid_grant", "PKCE code_verifier verification failed.");
  }

  // Load user
  const user = await userRepository.findById(stored.userId);
  if (!user || user.isDeleted || user.status !== "active") {
    throw new OAuthError("access_denied", "User account is inactive or has been deleted.");
  }

  const accessToken = signMcpAccessToken(
    stored.userId,
    user.role,
    stored.scope,
    stored.clientId,
  );

  const refreshToken = await issueRefreshToken({
    userId: stored.userId,
    clientId: stored.clientId,
    scope: stored.scope,
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: MCP_OAUTH_ACCESS_TOKEN_TTL_SEC,
    refresh_token: refreshToken,
    scope: stored.scope,
  };
}

/**
 * Token endpoint: refresh_token grant.
 *
 * Rotates the refresh token and issues a new JWT.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
}): Promise<OAuthTokenSuccessResponse> {
  const stored = await lookupRefreshToken(params.refreshToken);
  if (!stored) {
    throw new OAuthError("invalid_grant", "Refresh token is invalid or expired.");
  }

  if (stored.clientId !== params.clientId) {
    throw new OAuthError("invalid_client", "client_id mismatch.");
  }

  // Load user to confirm still active
  const user = await userRepository.findById(stored.userId);
  if (!user || user.isDeleted || user.status !== "active") {
    await revokeRefreshToken(params.refreshToken);
    throw new OAuthError("access_denied", "User account is inactive or has been deleted.");
  }

  // Rotate refresh token
  const newRefreshToken = await rotateRefreshToken(params.refreshToken, {
    userId: stored.userId,
    clientId: stored.clientId,
    scope: stored.scope,
  });

  const accessToken = signMcpAccessToken(
    stored.userId,
    user.role,
    stored.scope,
    stored.clientId,
  );

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: MCP_OAUTH_ACCESS_TOKEN_TTL_SEC,
    refresh_token: newRefreshToken,
    scope: stored.scope,
  };
}

/**
 * Token revocation endpoint (RFC 7009).
 * Silently succeeds if the token doesn't exist — per spec.
 */
export async function revokeToken(token: string): Promise<void> {
  // Attempt revocation regardless of type — revokeRefreshToken is a no-op if not found
  await revokeRefreshToken(token);
}

// ─── Typed OAuth error ────────────────────────────────────────────────────────

export class OAuthError extends Error {
  constructor(
    public readonly code: OAuthErrorCode,
    public readonly description: string,
    public readonly statusCode: number = 400,
  ) {
    super(description);
    this.name = "OAuthError";
  }
}
