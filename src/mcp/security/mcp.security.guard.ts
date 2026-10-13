import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ReadResourceCallback, ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatToolError, formatResourceError } from "../utils/mcp.helpers";
import { resolveSecurityContext } from "./mcp.security.context";
import { McpSecurityContext, McpSecurityOptions } from "./mcp.security.types";
import AppError from "../../utils/AppError";

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
export function guardToolHandler<TInput = any, TOutput = any>(
  handler: (
    input: TInput,
    extra: RequestHandlerExtra<any, any>,
    context?: McpSecurityContext | null,
  ) => Promise<TOutput>,
  options: McpSecurityOptions = {},
): (input: TInput, extra: RequestHandlerExtra<any, any>) => Promise<TOutput> {
  return async (input: TInput, extra: RequestHandlerExtra<any, any>): Promise<TOutput> => {
    try {
      const context = await resolveSecurityContext(input, extra, options);

      // Identity binding & Anti-Spoofing:
      // If the caller is authenticated, enforce their authentic identity into the payload
      if (context && typeof input === "object" && input !== null) {
        const mutableInput = input as Record<string, unknown>;

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
    } catch (err) {
      return formatToolError(err) as unknown as TOutput;
    }
  };
}

/**
 * Wraps a static MCP resource readHandler with authentication and authorization.
 */
export function guardStaticResource(
  readHandler: ReadResourceCallback,
  options: McpSecurityOptions = {},
): ReadResourceCallback {
  return (async (uri: URL, extra: RequestHandlerExtra<any, any>) => {
    try {
      await resolveSecurityContext(undefined, extra, options);
      return await readHandler(uri, extra);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceCallback;
}

/**
 * Wraps a templated MCP resource readHandler with authentication and authorization.
 */
export function guardTemplateResource(
  readHandler: ReadResourceTemplateCallback,
  options: McpSecurityOptions = {},
): ReadResourceTemplateCallback {
  return (async (uri: URL, variables: any, extra: RequestHandlerExtra<any, any>) => {
    try {
      await resolveSecurityContext(variables, extra, options);
      return await readHandler(uri, variables, extra);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceTemplateCallback;
}

/**
 * Wraps an MCP prompt handler with authentication and authorization.
 */
export function guardPromptHandler<TArgs = any, TResult = any>(
  handler: (
    args: TArgs,
    extra: RequestHandlerExtra<any, any>,
    context?: McpSecurityContext | null,
  ) => Promise<TResult>,
  options: McpSecurityOptions = {},
): (args: TArgs, extra: RequestHandlerExtra<any, any>) => Promise<TResult> {
  return async (args: TArgs, extra: RequestHandlerExtra<any, any>): Promise<TResult> => {
    try {
      const context = await resolveSecurityContext(args, extra, options);
      return await handler(args, extra, context);
    } catch (err) {
      const message = err instanceof AppError ? err.message : String(err);
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
      } as unknown as TResult;
    }
  };
}
