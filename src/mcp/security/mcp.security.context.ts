import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import jwt from "jsonwebtoken";
import { verifyAccessToken, authorizeRoles } from "../../auth/auth.core";
import { AuthUser } from "../../types/auth.types";
import AppError from "../../utils/AppError";
import { McpSecurityContext, McpSecurityOptions } from "./mcp.security.types";
import { googleAuthService } from "../../modules/GoogleAuth/google.service";

/**
 * Strips 'Bearer ' prefix and trims excess whitespace from a raw token string.
 */
export function sanitizeBearerToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase().startsWith("bearer ")) {
    const extracted = trimmed.slice(7).trim();
    return extracted.length > 0 ? extracted : null;
  }

  return trimmed;
}

/**
 * Extracts an authentication token from any available MCP request context.
 *
 * Checks in order of precedence:
 * 1. Protocol Request metadata (_meta.token or _meta.authorization)
 * 2. Standard SDK authInfo if populated by transport
 * 3. HTTP headers (Authorization or X-Access-Token) for HTTP/SSE transport
 * 4. Input payload properties (.token, ._meta.token)
 * 5. Environment variable MCP_ACCESS_TOKEN (fallback for local stdio sessions)
 */
export function extractTokenFromRequest(
  input?: unknown,
  extra?: RequestHandlerExtra<any, any>,
): string | null {
  // 1. Extra _meta (standard MCP protocol metadata)
  const meta = extra?._meta as Record<string, unknown> | undefined;
  if (meta) {
    const fromMeta =
      sanitizeBearerToken(meta["token"]) ??
      sanitizeBearerToken(meta["authorization"]) ??
      sanitizeBearerToken(meta["authToken"]);
    if (fromMeta) return fromMeta;
  }

  // 2. Transport authInfo
  const authInfo = (extra as any)?.authInfo;
  if (authInfo && typeof authInfo.token === "string") {
    const fromAuthInfo = sanitizeBearerToken(authInfo.token);
    if (fromAuthInfo) return fromAuthInfo;
  }

  // 3. HTTP Headers (if running via Streamable HTTP/SSE transport)
  const headers = extra?.requestInfo?.headers as Record<string, string | string[] | undefined> | undefined;
  if (headers) {
    const authHeader = headers["authorization"] || headers["Authorization"];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const fromHeader = sanitizeBearerToken(headerValue);
    if (fromHeader) return fromHeader;

    const xToken = headers["x-access-token"] || headers["X-Access-Token"];
    const xTokenValue = Array.isArray(xToken) ? xToken[0] : xToken;
    const fromXToken = sanitizeBearerToken(xTokenValue);
    if (fromXToken) return fromXToken;
  }

  // 4. Input payload properties (e.g. caller passed { token: "..." } in arguments)
  if (typeof input === "object" && input !== null) {
    const inputObj = input as Record<string, unknown>;

    const fromInput =
      sanitizeBearerToken(inputObj["token"]) ??
      sanitizeBearerToken(inputObj["authorization"]);
    if (fromInput) return fromInput;

    const inputMeta = inputObj["_meta"] as Record<string, unknown> | undefined;
    if (inputMeta) {
      const fromInputMeta =
        sanitizeBearerToken(inputMeta["token"]) ??
        sanitizeBearerToken(inputMeta["authorization"]);
      if (fromInputMeta) return fromInputMeta;
    }
  }

  // 5. Fallback: Environment variable for stdio sessions
  const envToken = process.env.MCP_ACCESS_TOKEN;
  if (envToken) {
    return sanitizeBearerToken(envToken);
  }

  return null;
}

/**
 * Resolves and validates the security context for an MCP request.
 *
 * Uses verifyAccessToken() and authorizeRoles() from src/auth/auth.core.ts.
 *
 * @throws AppError 401 if authentication is required but missing or invalid
 * @throws AppError 403 if roles are required but the user's role is not authorized
 */
export async function resolveSecurityContext(
  input?: unknown,
  extra?: RequestHandlerExtra<any, any>,
  options: McpSecurityOptions = {},
): Promise<McpSecurityContext | null> {
  const { requireAuth = true, roles, authorize, actionName } = options;

  const rawToken = extractTokenFromRequest(input, extra);

  if (!rawToken) {
    if (requireAuth) {
      const actionLabel = actionName ? ` for "${actionName}"` : "";
      throw new AppError(
        `Unauthorized: Authentication token is required${actionLabel}. ` +
          `Provide a valid Bearer token via _meta.authorization, arguments.token, or the MCP_ACCESS_TOKEN environment variable.`,
        401,
      );
    }
    return null;
  }

  // Validate the access token using auth.core.ts (with Google OAuth token fallback)
  let user: AuthUser;
  try {
    // First try standard app JWT, then try MCP OAuth AS JWT (aud: "mcp")
    user = verifyAccessToken(rawToken);
  } catch (err: any) {
    try {
      // Try MCP-issued OAuth JWT (has aud="mcp" claim, same signing key)
      const decoded = jwt.verify(rawToken, process.env.ACCESS_TOKEN!) as any;
      if (decoded && typeof decoded.id === "string" && typeof decoded.role === "string") {
        user = { id: decoded.id, role: decoded.role };
      } else {
        throw new Error("Invalid MCP OAuth token payload");
      }
    } catch {
      try {
        const { user: googleUser } =
          await googleAuthService.authenticateGoogleToken(rawToken);
        user = {
          id: googleUser._id.toString(),
          role: googleUser.role,
        };
      } catch {
        throw err;
      }
    }
  }

  // Enforce role authorization if specified
  if (roles && roles.length > 0) {
    authorizeRoles(user, ...roles);
  }

  // Run custom domain authorization if supplied
  if (authorize) {
    await authorize(user, input, extra);
  }

  return {
    user,
    token: rawToken,
    transport: extra?.requestInfo ? "http" : "stdio",
  };
}

/**
 * Creates a static security context from the environment variable (for startup/stdio checks).
 */
export function createStdioSecurityContext(): McpSecurityContext {
  const token = process.env.MCP_ACCESS_TOKEN;

  if (!token) {
    throw new AppError(
      "MCP_ACCESS_TOKEN is not configured in environment",
      401,
    );
  }

  const clean = sanitizeBearerToken(token)!;
  return {
    user: verifyAccessToken(clean),
    token: clean,
    transport: "stdio",
  };
}