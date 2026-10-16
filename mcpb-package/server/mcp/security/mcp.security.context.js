"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBearerToken = sanitizeBearerToken;
exports.extractTokenFromRequest = extractTokenFromRequest;
exports.resolveSecurityContext = resolveSecurityContext;
exports.createStdioSecurityContext = createStdioSecurityContext;
const auth_core_1 = require("../../auth/auth.core");
const AppError_1 = __importDefault(require("../../utils/AppError"));
/**
 * Strips 'Bearer ' prefix and trims excess whitespace from a raw token string.
 */
function sanitizeBearerToken(raw) {
    if (typeof raw !== "string")
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
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
function extractTokenFromRequest(input, extra) {
    // 1. Extra _meta (standard MCP protocol metadata)
    const meta = extra?._meta;
    if (meta) {
        const fromMeta = sanitizeBearerToken(meta["token"]) ??
            sanitizeBearerToken(meta["authorization"]) ??
            sanitizeBearerToken(meta["authToken"]);
        if (fromMeta)
            return fromMeta;
    }
    // 2. Transport authInfo
    const authInfo = extra?.authInfo;
    if (authInfo && typeof authInfo.token === "string") {
        const fromAuthInfo = sanitizeBearerToken(authInfo.token);
        if (fromAuthInfo)
            return fromAuthInfo;
    }
    // 3. HTTP Headers (if running via Streamable HTTP/SSE transport)
    const headers = extra?.requestInfo?.headers;
    if (headers) {
        const authHeader = headers["authorization"] || headers["Authorization"];
        const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
        const fromHeader = sanitizeBearerToken(headerValue);
        if (fromHeader)
            return fromHeader;
        const xToken = headers["x-access-token"] || headers["X-Access-Token"];
        const xTokenValue = Array.isArray(xToken) ? xToken[0] : xToken;
        const fromXToken = sanitizeBearerToken(xTokenValue);
        if (fromXToken)
            return fromXToken;
    }
    // 4. Input payload properties (e.g. caller passed { token: "..." } in arguments)
    if (typeof input === "object" && input !== null) {
        const inputObj = input;
        const fromInput = sanitizeBearerToken(inputObj["token"]) ??
            sanitizeBearerToken(inputObj["authorization"]);
        if (fromInput)
            return fromInput;
        const inputMeta = inputObj["_meta"];
        if (inputMeta) {
            const fromInputMeta = sanitizeBearerToken(inputMeta["token"]) ??
                sanitizeBearerToken(inputMeta["authorization"]);
            if (fromInputMeta)
                return fromInputMeta;
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
async function resolveSecurityContext(input, extra, options = {}) {
    const { requireAuth = true, roles, authorize, actionName } = options;
    const rawToken = extractTokenFromRequest(input, extra);
    if (!rawToken) {
        if (requireAuth) {
            const actionLabel = actionName ? ` for "${actionName}"` : "";
            throw new AppError_1.default(`Unauthorized: Authentication token is required${actionLabel}. ` +
                `Provide a valid Bearer token via _meta.authorization, arguments.token, or the MCP_ACCESS_TOKEN environment variable.`, 401);
        }
        return null;
    }
    // Validate the access token using auth.core.ts
    const user = (0, auth_core_1.verifyAccessToken)(rawToken);
    // Enforce role authorization if specified
    if (roles && roles.length > 0) {
        (0, auth_core_1.authorizeRoles)(user, ...roles);
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
function createStdioSecurityContext() {
    const token = process.env.MCP_ACCESS_TOKEN;
    if (!token) {
        throw new AppError_1.default("MCP_ACCESS_TOKEN is not configured in environment", 401);
    }
    const clean = sanitizeBearerToken(token);
    return {
        user: (0, auth_core_1.verifyAccessToken)(clean),
        token: clean,
        transport: "stdio",
    };
}
