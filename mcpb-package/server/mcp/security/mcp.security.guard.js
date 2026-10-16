"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardToolHandler = guardToolHandler;
exports.guardStaticResource = guardStaticResource;
exports.guardTemplateResource = guardTemplateResource;
exports.guardPromptHandler = guardPromptHandler;
const mcp_helpers_1 = require("../utils/mcp.helpers");
const mcp_security_context_1 = require("./mcp.security.context");
const AppError_1 = __importDefault(require("../../utils/AppError"));
/**
 * Wraps an MCP tool handler with enterprise-grade authentication and authorization.
 *
 * Security features:
 * - Validates JWT access token via src/auth/auth.core.ts
 * - Enforces role-based authorization (RBAC) via authorizeRoles()
 * - Anti-spoofing: Automatically binds verified user identity (userId, requesterId, requesterRole)
 *   to the input payload, preventing clients from spoofing admin roles or other user IDs
 * - Standardized error formatting via formatToolError (401 Unauthorized / 403 Forbidden)
 * - Safe fallback for optional auth endpoints
 */
function guardToolHandler(handler, options = {}) {
    return async (input, extra) => {
        try {
            const context = await (0, mcp_security_context_1.resolveSecurityContext)(input, extra, options);
            // Identity binding & Anti-Spoofing:
            // If the caller is authenticated, enforce their authentic identity into the payload
            if (context && typeof input === "object" && input !== null) {
                const mutableInput = input;
                // Bind requesterId and requesterRole
                if ("requesterId" in mutableInput) {
                    mutableInput["requesterId"] = context.user.id;
                }
                if ("requesterRole" in mutableInput) {
                    mutableInput["requesterRole"] = context.user.role;
                }
                // Bind userId for actions acting on behalf of self
                if ("userId" in mutableInput) {
                    // If the user is non-admin and tries to pass a different userId, enforce context.user.id
                    if (context.user.role !== "admin" || !mutableInput["userId"]) {
                        mutableInput["userId"] = context.user.id;
                    }
                }
            }
            return await handler(input, extra, context);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    };
}
/**
 * Wraps a static MCP resource readHandler with authentication and authorization.
 */
function guardStaticResource(readHandler, options = {}) {
    return (async (uri, extra) => {
        try {
            await (0, mcp_security_context_1.resolveSecurityContext)(undefined, extra, options);
            return await readHandler(uri, extra);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    });
}
/**
 * Wraps a templated MCP resource readHandler with authentication and authorization.
 */
function guardTemplateResource(readHandler, options = {}) {
    return (async (uri, variables, extra) => {
        try {
            await (0, mcp_security_context_1.resolveSecurityContext)(variables, extra, options);
            return await readHandler(uri, variables, extra);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    });
}
/**
 * Wraps an MCP prompt handler with authentication and authorization.
 */
function guardPromptHandler(handler, options = {}) {
    return async (args, extra) => {
        try {
            const context = await (0, mcp_security_context_1.resolveSecurityContext)(args, extra, options);
            return await handler(args, extra, context);
        }
        catch (err) {
            const message = err instanceof AppError_1.default ? err.message : String(err);
            return {
                description: `Authorization failed for ${options.actionName ?? "prompt"}`,
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `[MCP Security Error] Access denied: ${message}`,
                        },
                    },
                ],
            };
        }
    };
}
