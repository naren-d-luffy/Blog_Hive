import { createHash, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Validates PKCE code_verifier against code_challenge using SHA-256 (RFC 7636).
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  if (!codeVerifier || !codeChallenge) return false;

  // RFC 7636 §4.1: length must be between 43 and 128 characters
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  // Permitted characters: [A-Z], [a-z], [0-9], "-", ".", "_", "~"
  const verifierRegex = /^[A-Za-z0-9\-._~]+$/;
  if (!verifierRegex.test(codeVerifier)) {
    return false;
  }

  const calculated = createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64url");

  const calcBuf = Buffer.from(calculated, "utf8");
  const chalBuf = Buffer.from(codeChallenge, "utf8");

  if (calcBuf.length !== chalBuf.length) {
    return false;
  }

  return timingSafeEqual(calcBuf, chalBuf);
}

/**
 * Derives code_challenge from code_verifier (useful for tests and clients).
 */
export function deriveCodeChallenge(codeVerifier: string): string {
  return createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64url");
}

/**
 * Validates redirect URI strictly against registered URIs.
 * RFC 6749 §3.1.2 & OAuth 2.1:
 * - Exact string match.
 * - No fragments allowed.
 * - Must be valid HTTPS (or HTTP for localhost).
 */
export function validateRedirectUri(
  requestedUri: string,
  registeredUris: string[],
): boolean {
  if (!requestedUri || !registeredUris || registeredUris.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(requestedUri);

    // Fragments are strictly forbidden in OAuth redirect URIs
    if (parsed.hash) {
      return false;
    }

    // Require HTTPS unless loopback/localhost
    const isLocalhost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";

    if (parsed.protocol !== "https:" && !isLocalhost) {
      return false;
    }

    // Strict exact string matching
    return registeredUris.includes(requestedUri);
  } catch {
    return false;
  }
}

/**
 * Validates that requested space-separated scopes are allowed for the client.
 */
export function validateScopes(
  requestedScope: string,
  allowedScopes: string[],
): { isValid: boolean; scopes: string[] } {
  if (!requestedScope || !requestedScope.trim()) {
    return { isValid: true, scopes: [] };
  }

  const requestedList = requestedScope.trim().split(/\s+/).filter(Boolean);
  const isValid = requestedList.every((s) => allowedScopes.includes(s));

  return { isValid, scopes: requestedList };
}

/**
 * Generates high-entropy cryptographic token string.
 */
export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * SHA-256 hash helper for database lookup of refresh tokens and auth code tracking.
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Parses HTTP Basic Authentication header (RFC 6749 §2.3.1).
 */
export function parseBasicAuthHeader(
  header?: string,
): { clientId: string; clientSecret: string } | null {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  try {
    const base64Credentials = header.slice("Basic ".length).trim();
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
    const delimiterIndex = credentials.indexOf(":");

    if (delimiterIndex === -1) {
      return null;
    }

    const clientId = decodeURIComponent(credentials.slice(0, delimiterIndex));
    const clientSecret = decodeURIComponent(credentials.slice(delimiterIndex + 1));

    return { clientId, clientSecret };
  } catch {
    return null;
  }
}
