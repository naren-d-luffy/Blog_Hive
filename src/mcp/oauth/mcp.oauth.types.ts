/**
 * OAuth 2.0 Authorization Server types for the MCP server.
 *
 * Implements RFC 6749 (Authorization Code Flow) +
 *            RFC 7636 (PKCE) +
 *            RFC 8414 (Authorization Server Metadata) +
 *            RFC 7009 (Token Revocation)
 */

// ─── Authorization Server Metadata (RFC 8414) ────────────────────────────────

export interface OAuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  registration_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  scopes_supported: string[];
  service_documentation?: string;
}

// ─── Dynamic Client Registration (RFC 7591) ───────────────────────────────────

export interface DcrRegistrationRequest {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
}

export interface DcrRegistrationResponse {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope: string;
  client_id_issued_at: number;
}

/**
 * Stored in Redis for registered OAuth clients.
 * Key: mcp:oauth:client:{clientId}  TTL: 90 days (re-registered on each connect)
 */
export interface StoredOAuthClient {
  clientId: string;
  clientName?: string;
  redirectUris: string[];
  scope: string;
  registeredAt: number;
}

// ─── Stored State ─────────────────────────────────────────────────────────────

/**
 * Stored in Redis during the authorize → callback leg.
 * Key: mcp:oauth:state:{state}  TTL: 10 minutes
 */
export interface StoredMcpOAuthState {
  /** Client ID from the MCP client (Claude Desktop) */
  clientId: string;
  /** PKCE code challenge from the MCP client */
  codeChallenge: string;
  /** Always "S256" */
  codeChallengeMethod: "S256";
  /** Where to redirect the MCP client after token exchange */
  redirectUri: string;
  /** Scope requested by the MCP client */
  scope: string;
  /** The original state param Claude sent — must be echoed back */
  clientState: string;
  /** Internal PKCE code verifier used for the Google → us leg */
  googleCodeVerifier: string;
  /** Google's opaque state value we generated */
  googleState: string;
  /** Unix ms timestamp */
  createdAt: number;
}

/**
 * Stored in Redis after a successful Google callback, before Claude exchanges it for a token.
 * Key: mcp:oauth:code:{code}  TTL: 5 minutes (one-time use)
 */
export interface StoredMcpAuthCode {
  /** Our app's user _id */
  userId: string;
  /** Client ID from the MCP client */
  clientId: string;
  /** PKCE code challenge from the MCP client */
  codeChallenge: string;
  /** Where the MCP client registered as its redirect URI */
  redirectUri: string;
  /** Granted scope */
  scope: string;
  /** Unix ms timestamp */
  createdAt: number;
}

/**
 * Stored in Redis for refresh token → user mapping.
 * Key: mcp:oauth:refresh:{tokenHash}  TTL: 30 days
 */
export interface StoredMcpRefreshToken {
  userId: string;
  clientId: string;
  scope: string;
  issuedAt: number;
}

// ─── Request/Response shapes ──────────────────────────────────────────────────

export interface OAuthTokenSuccessResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface OAuthErrorResponse {
  error: OAuthErrorCode;
  error_description?: string;
}

export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "server_error"
  | "access_denied";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MCP_OAUTH_STATE_TTL_SEC = 600;     // 10 minutes
export const MCP_OAUTH_CODE_TTL_SEC  = 300;     // 5 minutes  (one-time use)
export const MCP_OAUTH_REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
export const MCP_OAUTH_ACCESS_TOKEN_TTL_SEC = 60 * 60;       // 1 hour

/** Scopes this AS supports */
export const SUPPORTED_SCOPES = ["mcp:read", "mcp:write", "profile"] as const;
export type McpScope = (typeof SUPPORTED_SCOPES)[number];
