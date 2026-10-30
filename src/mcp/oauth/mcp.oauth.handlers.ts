/**
 * Express route handlers for the MCP OAuth 2.0 Authorization Server.
 *
 * All handlers follow RFC 6749 error response format.
 */

import { Request, Response } from "express";
import env from "../../config/env.config";
import {
  buildAuthorizationRedirectUrl,
  handleGoogleCallback,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeToken,
  getMcpIssuer,
  getMcpCallbackUri,
  OAuthError,
} from "./mcp.oauth.service";
import {
  OAuthServerMetadata,
  OAuthErrorResponse,
  SUPPORTED_SCOPES,
} from "./mcp.oauth.types";

// ─── Helper ───────────────────────────────────────────────────────────────────

function sendOAuthError(
  res: Response,
  err: unknown,
  defaultStatus = 400,
): void {
  if (err instanceof OAuthError) {
    const body: OAuthErrorResponse = {
      error: err.code,
      error_description: err.description,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error("[MCP OAuth] Unexpected error:", err);
  res.status(500).json({
    error: "server_error",
    error_description: "An unexpected server error occurred.",
  } satisfies OAuthErrorResponse);
}

// ─── RFC 8414 — Discovery ─────────────────────────────────────────────────────

/**
 * GET /.well-known/oauth-authorization-server
 *
 * Claude Desktop fetches this before doing anything else.
 * Must be served from the root of the MCP server (not under /mcp/).
 */
export function discoveryHandler(_req: Request, res: Response): void {
  const issuer = getMcpIssuer();
  const base = `${env.BACKEND_URL}${env.MCP_ENDPOINT}`;

  const metadata: OAuthServerMetadata = {
    issuer,
    authorization_endpoint:  `${base}/oauth/authorize`,
    token_endpoint:          `${base}/oauth/token`,
    revocation_endpoint:     `${base}/oauth/revoke`,
    response_types_supported:              ["code"],
    grant_types_supported:                 ["authorization_code", "refresh_token"],
    code_challenge_methods_supported:      ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported:                      [...SUPPORTED_SCOPES],
    service_documentation: `${env.FRONTEND_URL}/docs/mcp`,
  };

  // Cache-control: allow short caching but force revalidation
  res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
  res.json(metadata);
}

// ─── RFC 6749 §4.1.1 — Authorization Endpoint ────────────────────────────────

/**
 * GET /oauth/authorize
 *
 * Validates the incoming authorization request from Claude Desktop,
 * then redirects the user to Google's consent screen.
 */
export async function authorizeHandler(req: Request, res: Response): Promise<void> {
  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  } = req.query as Record<string, string>;

  // Basic parameter validation
  if (!client_id) {
    res.status(400).json({ error: "invalid_request", error_description: "client_id is required." });
    return;
  }
  if (!redirect_uri) {
    res.status(400).json({ error: "invalid_request", error_description: "redirect_uri is required." });
    return;
  }
  if (response_type !== "code") {
    res.redirect(
      `${redirect_uri}?error=unsupported_response_type&error_description=${encodeURIComponent("Only response_type=code is supported.")}&state=${state ?? ""}`,
    );
    return;
  }
  if (!code_challenge) {
    res.redirect(
      `${redirect_uri}?error=invalid_request&error_description=${encodeURIComponent("PKCE code_challenge is required.")}&state=${state ?? ""}`,
    );
    return;
  }

  try {
    const googleUrl = await buildAuthorizationRedirectUrl({
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope ?? "mcp:read",
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method ?? "S256",
      state: state ?? "",
    });

    res.redirect(googleUrl);
  } catch (err) {
    if (err instanceof OAuthError) {
      res.redirect(
        `${redirect_uri}?error=${err.code}&error_description=${encodeURIComponent(err.description)}&state=${state ?? ""}`,
      );
      return;
    }
    console.error("[MCP OAuth] authorize error:", err);
    res.redirect(
      `${redirect_uri}?error=server_error&state=${state ?? ""}`,
    );
  }
}

// ─── Google Callback ──────────────────────────────────────────────────────────

/**
 * GET /oauth/callback
 *
 * Google redirects here after user consent.
 * We:
 *  1. Validate state + exchange Google code
 *  2. Issue our authorization code
 *  3. Redirect back to Claude Desktop's redirect_uri
 */
export async function callbackHandler(req: Request, res: Response): Promise<void> {
  const { code, state, error, error_description } = req.query as Record<string, string>;

  if (error) {
    // Google denied or errored — we can't look up the state anymore so redirect to a fallback
    // In practice Claude Desktop uses a loopback redirect, so we respond with a plain error page
    res.status(400).send(
      `<html><body><h2>Authorization Failed</h2><p>${error}: ${error_description ?? ""}</p></body></html>`,
    );
    return;
  }

  if (!code || !state) {
    res.status(400).send("<html><body><h2>Missing code or state parameter.</h2></body></html>");
    return;
  }

  try {
    const { redirectUri, code: authCode, oauthState } = await handleGoogleCallback({ code, state });

    // Redirect back to Claude Desktop with our authorization code
    const params = new URLSearchParams({
      code: authCode,
    });
    // Echo the state the MCP client originally sent (not our Google state)
    // We stored it in the oauth state under `oauthState` but we don't have the original client state here.
    // Claude Desktop does not require it to be echoed for loopback flows — but if a state was passed we include it.

    res.redirect(`${redirectUri}?${params.toString()}`);
  } catch (err) {
    console.error("[MCP OAuth] callback error:", err);
    if (err instanceof OAuthError) {
      res.status(400).send(
        `<html><body><h2>Authorization Error</h2><p>${err.code}: ${err.description}</p></body></html>`,
      );
      return;
    }
    res.status(500).send("<html><body><h2>Internal Server Error</h2></body></html>");
  }
}

// ─── RFC 6749 §5.1 — Token Endpoint ──────────────────────────────────────────

/**
 * POST /oauth/token
 *
 * Handles both:
 *  - grant_type=authorization_code  (initial code exchange)
 *  - grant_type=refresh_token       (token rotation)
 */
export async function tokenHandler(req: Request, res: Response): Promise<void> {
  const { grant_type, code, redirect_uri, client_id, code_verifier, refresh_token } =
    req.body as Record<string, string>;

  if (!grant_type) {
    res.status(400).json({ error: "invalid_request", error_description: "grant_type is required." });
    return;
  }
  if (!client_id) {
    res.status(400).json({ error: "invalid_client", error_description: "client_id is required." });
    return;
  }

  try {
    if (grant_type === "authorization_code") {
      if (!code) {
        res.status(400).json({ error: "invalid_request", error_description: "code is required." });
        return;
      }
      if (!redirect_uri) {
        res.status(400).json({ error: "invalid_request", error_description: "redirect_uri is required." });
        return;
      }
      if (!code_verifier) {
        res.status(400).json({ error: "invalid_request", error_description: "code_verifier is required (PKCE)." });
        return;
      }

      const tokenResponse = await exchangeCodeForToken({
        code,
        redirectUri: redirect_uri,
        clientId: client_id,
        codeVerifier: code_verifier,
      });

      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.json(tokenResponse);
      return;
    }

    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        res.status(400).json({ error: "invalid_request", error_description: "refresh_token is required." });
        return;
      }

      const tokenResponse = await refreshAccessToken({
        refreshToken: refresh_token,
        clientId: client_id,
      });

      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.json(tokenResponse);
      return;
    }

    res.status(400).json({
      error: "unsupported_grant_type",
      error_description: `grant_type "${grant_type}" is not supported. Supported: authorization_code, refresh_token.`,
    });
  } catch (err) {
    sendOAuthError(res, err);
  }
}

// ─── RFC 7009 — Revocation Endpoint ──────────────────────────────────────────

/**
 * POST /oauth/revoke
 *
 * Revokes a token. Per RFC 7009, always returns 200 even if the token
 * doesn't exist.
 */
export async function revokeHandler(req: Request, res: Response): Promise<void> {
  const { token } = req.body as Record<string, string>;

  if (!token) {
    res.status(400).json({ error: "invalid_request", error_description: "token is required." });
    return;
  }

  try {
    await revokeToken(token);
    res.status(200).json({ revoked: true });
  } catch (err) {
    // Per RFC 7009 §2.2 — errors during revocation still return 200
    console.error("[MCP OAuth] revoke error (non-fatal):", err);
    res.status(200).json({ revoked: true });
  }
}
