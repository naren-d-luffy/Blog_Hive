/**
 * Redis-backed store for the MCP OAuth 2.0 Authorization Server.
 *
 * All state objects are short-lived and stored only in Redis — nothing in MongoDB.
 * Keys are prefixed with `mcp:oauth:` to avoid collisions.
 */

import crypto from "node:crypto";
import { redisClient } from "../../config/redis.config";
import {
  StoredMcpOAuthState,
  StoredMcpAuthCode,
  StoredMcpRefreshToken,
  MCP_OAUTH_STATE_TTL_SEC,
  MCP_OAUTH_CODE_TTL_SEC,
  MCP_OAUTH_REFRESH_TTL_SEC,
} from "./mcp.oauth.types";

// ─── Key helpers ──────────────────────────────────────────────────────────────

const stateKey   = (state: string)        => `mcp:oauth:state:${state}`;
const codeKey    = (code: string)         => `mcp:oauth:code:${code}`;
const refreshKey = (tokenHash: string)    => `mcp:oauth:refresh:${tokenHash}`;

/** HMAC-SHA256 of the raw token — never store raw refresh tokens in Redis */
function hashRefreshToken(raw: string): string {
  // Use a deterministic but non-guessable key derived from the token itself.
  // For additional entropy we prefix with "mcp-refresh" namespace.
  return crypto.createHash("sha256").update(`mcp-refresh:${raw}`).digest("hex");
}

// ─── Authorization State ──────────────────────────────────────────────────────

export async function saveOAuthState(
  state: string,
  payload: StoredMcpOAuthState,
): Promise<void> {
  await redisClient.set(
    stateKey(state),
    JSON.stringify(payload),
    "EX",
    MCP_OAUTH_STATE_TTL_SEC,
  );
}

/**
 * Retrieve and immediately delete the state (one-time use — prevents CSRF replay).
 */
export async function consumeOAuthState(
  state: string,
): Promise<StoredMcpOAuthState | null> {
  const key = stateKey(state);
  const raw = await redisClient.get(key);
  if (!raw) return null;
  await redisClient.del(key);
  return JSON.parse(raw) as StoredMcpOAuthState;
}

// ─── Authorization Codes ──────────────────────────────────────────────────────

/**
 * Issues and stores a new one-time-use authorization code.
 * Returns the raw code value (sent to the MCP client as `code` query param).
 */
export async function issueAuthCode(
  payload: Omit<StoredMcpAuthCode, "createdAt">,
): Promise<string> {
  const code = crypto.randomBytes(32).toString("base64url");
  const stored: StoredMcpAuthCode = { ...payload, createdAt: Date.now() };
  await redisClient.set(
    codeKey(code),
    JSON.stringify(stored),
    "EX",
    MCP_OAUTH_CODE_TTL_SEC,
  );
  return code;
}

/**
 * Consume an authorization code — retrieves it and immediately deletes it.
 * Returns null if the code doesn't exist or has expired.
 */
export async function consumeAuthCode(
  code: string,
): Promise<StoredMcpAuthCode | null> {
  const key = codeKey(code);
  const raw = await redisClient.get(key);
  if (!raw) return null;
  await redisClient.del(key);
  return JSON.parse(raw) as StoredMcpAuthCode;
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

/**
 * Issues a new opaque refresh token and stores its metadata in Redis.
 * Returns the raw token value to send to the client.
 */
export async function issueRefreshToken(
  payload: Omit<StoredMcpRefreshToken, "issuedAt">,
): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hash = hashRefreshToken(raw);
  const stored: StoredMcpRefreshToken = { ...payload, issuedAt: Date.now() };
  await redisClient.set(
    refreshKey(hash),
    JSON.stringify(stored),
    "EX",
    MCP_OAUTH_REFRESH_TTL_SEC,
  );
  return raw;
}

/**
 * Look up a refresh token.  Does NOT delete it — refresh tokens are long-lived
 * and rotated explicitly by the token endpoint.
 */
export async function lookupRefreshToken(
  raw: string,
): Promise<StoredMcpRefreshToken | null> {
  const hash = hashRefreshToken(raw);
  const stored = await redisClient.get(refreshKey(hash));
  if (!stored) return null;
  return JSON.parse(stored) as StoredMcpRefreshToken;
}

/**
 * Rotate a refresh token: delete the old one, issue a new one.
 * Returns the new raw refresh token.
 */
export async function rotateRefreshToken(
  oldRaw: string,
  payload: Omit<StoredMcpRefreshToken, "issuedAt">,
): Promise<string> {
  const oldHash = hashRefreshToken(oldRaw);
  await redisClient.del(refreshKey(oldHash));
  return issueRefreshToken(payload);
}

/**
 * Revoke a refresh token by deleting it from Redis.
 */
export async function revokeRefreshToken(raw: string): Promise<void> {
  const hash = hashRefreshToken(raw);
  await redisClient.del(refreshKey(hash));
}
