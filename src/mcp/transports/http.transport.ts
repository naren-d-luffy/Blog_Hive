import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { mcpConfig } from "../../config/mcp/mcp.config";
import { SessionManager } from "./session.manager";
import { createMcpServerInstance } from "../server.factory";
import { verifyAccessToken } from "../../auth/auth.core";
import { sanitizeBearerToken } from "../security/mcp.security.context";
import { googleAuthService } from "../../modules/GoogleAuth/google.service";
import { discoveryHandler } from "../oauth/mcp.oauth.handlers";
import { createOAuthRouter } from "../oauth/mcp.oauth.router";

/**
 * Injects the verified Bearer token into the JSON-RPC request body's params._meta.
 *
 * The MCP SDK does not forward HTTP headers into tool handler extras for the
 * Streamable HTTP transport. Injecting the token here means extractTokenFromRequest
 * will find it at check #1 (extra._meta.authorization) inside every tool/resource/prompt handler.
 */
function injectAuthIntoBody(body: unknown, token: string | undefined): unknown {
  if (!token || typeof body !== "object" || body === null) {
    console.error(`[MCP AUTH DEBUG] injectAuthIntoBody skipped — token=${!!token} bodyType=${typeof body}`);
    return body;
  }

  const rpc = body as Record<string, unknown>;
  if (typeof rpc.method !== "string") return body;

  const params = (rpc.params ?? {}) as Record<string, unknown>;
  const meta = (params["_meta"] ?? {}) as Record<string, unknown>;

  console.error(`[MCP AUTH DEBUG] injectAuthIntoBody — method=${rpc.method} injecting token`);

  return {
    ...rpc,
    params: {
      ...params,
      _meta: {
        ...meta,
        authorization: `Bearer ${token}`,
      },
    },
  };
}

/**
 * Creates and configures the production-standard Express app for the MCP Streamable HTTP server.
 */
export function createMcpHttpApp(sessionManager: SessionManager) {
  const app = createMcpExpressApp({
    host: mcpConfig.http.host,
    allowedHosts: mcpConfig.http.allowedHosts,
  });

  const endpoint = mcpConfig.http.endpoint;

  // ─── Production CORS Middleware ─────────────────────────────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowed = mcpConfig.http.allowedOrigins;

    if (allowed.includes("*") || (origin && allowed.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, DELETE, OPTIONS, HEAD",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, X-Access-Token, Mcp-Protocol-Version",
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Mcp-Session-Id, Last-Event-ID, Mcp-Protocol-Version",
    );

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  // ─── RFC 8414 Discovery — must be at root, unauthenticated ─────────────────
  app.get("/.well-known/oauth-authorization-server", discoveryHandler);

  // ─── RFC 9728 Protected Resource Metadata — tells Claude where the AS lives ──
  app.get("/.well-known/oauth-protected-resource", (_req: Request, res: Response) => {
    const base = `${process.env.BACKEND_URL}${endpoint}`;
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.json({
      resource: base,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
      resource_documentation: `${process.env.FRONTEND_URL}/docs/mcp`,
    });
  });

  // ─── OAuth 2.0 AS endpoints (/oauth/authorize, /callback, /token, /revoke) ──
  app.use(`${endpoint}/oauth`, createOAuthRouter());

  // ─── Authentication Middleware ─────────────────────────────────────────────
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const rawHeader =
      req.headers["authorization"] || req.headers["x-access-token"];
    const tokenStr = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const token = sanitizeBearerToken(tokenStr);

    // ── DEBUG: remove after diagnosis ──────────────────────────────────────
    if (req.path === mcpConfig.http.endpoint && req.method === "POST") {
      console.error(
        `[MCP AUTH DEBUG] path=${req.path} method=${req.method} ` +
        `hasAuthHeader=${!!rawHeader} tokenPresent=${!!token} ` +
        `sessionId=${req.headers["mcp-session-id"] ?? "none"} ` +
        `body.method=${typeof req.body === "object" ? (req.body as any)?.method : "n/a"}`,
      );
    }
    // ───────────────────────────────────────────────────────────────────────

    if (token) {
      try {
        const user = verifyAccessToken(token);
        (req as any).auth = { token, user };
        (req as any).user = user;
        console.error(`[MCP AUTH DEBUG] JWT verified OK — userId=${user.id} role=${user.role}`);
      } catch (jwtErr: any) {
        // Fallback: Check if token is a Google OAuth ID Token or Access Token
        try {
          const { user: googleUser } =
            await googleAuthService.authenticateGoogleToken(token);
          const user = {
            id: googleUser._id.toString(),
            role: googleUser.role,
          };
          (req as any).auth = { token, user };
          (req as any).user = user;
          console.error(`[MCP AUTH DEBUG] Google token verified OK — userId=${user.id}`);
        } catch (googleErr: any) {
          console.error(
            `[MCP AUTH DEBUG] Token verification FAILED — jwtErr=${jwtErr.message} googleErr=${googleErr.message}`,
          );
          if (mcpConfig.security.strictMode) {
            res.status(401).json({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: `Unauthorized: Invalid or expired access token (${jwtErr.message})`,
              },
              id: null,
            });
            return;
          }
        }
      }
    } else if (req.path === mcpConfig.http.endpoint) {
      // No token — challenge with WWW-Authenticate so Claude triggers OAuth.
      // Exception: initialize and server/discover are MCP handshake messages
      // that must be allowed through unauthenticated so Claude can connect.
      const bodyMethod = typeof req.body === "object" ? (req.body as any)?.method : null;
      const isHandshake = bodyMethod === "initialize" || bodyMethod === "server/discover";

      if (mcpConfig.security.strictMode && !isHandshake) {
        const issuer = `${process.env.BACKEND_URL}${mcpConfig.http.endpoint}`;
        res.setHeader(
          "WWW-Authenticate",
          `Bearer realm="${issuer}", ` +
          `resource_metadata="${process.env.BACKEND_URL}/.well-known/oauth-protected-resource"`,
        );
        res.status(401).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Unauthorized: Bearer token required." },
          id: null,
        });
        return;
      }
    }

    next();
  });

  // ─── Health & Diagnostics Endpoint ──────────────────────────────────────────
  app.get(["/health", `${mcpConfig.http.endpoint}/health`], (_req: Request, res: Response) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? "ok" : "degraded",
      server: mcpConfig.serverName,
      version: mcpConfig.serverVersion,
      transport: "streamable-http",
      uptimeSeconds: Math.floor(process.uptime()),
      sessions: sessionManager.getStats(),
      database: dbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── POST /mcp (JSON-RPC requests & Session Initialization) ──────────────────
  app.post(endpoint, async (req: Request, res: Response): Promise<void> => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader)
      ? sessionIdHeader[0]
      : sessionIdHeader;

    try {
      // 1. Existing Session request
      if (sessionId) {
        const session = sessionManager.getSession(sessionId);
        if (!session) {
          res.status(404).json({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Session not found or has expired. Please re-initialize.",
            },
            id: null,
          });
          return;
        }

        // Inject the verified token into the JSON-RPC body _meta so tool
        // handlers can read it via extra._meta.authorization
        const enrichedBody = injectAuthIntoBody(req.body, (req as any).auth?.token);
        console.error(`[MCP AUTH DEBUG] POST existing session — auth=${!!(req as any).auth} token=${!!(req as any).auth?.token}`);

        // For action calls (tools/call, resources/read, prompts/get) with no token,
        // issue a WWW-Authenticate challenge so Claude triggers the OAuth flow.
        const bodyMethod = typeof req.body === "object" ? (req.body as any)?.method : null;
        const isActionCall = bodyMethod === "tools/call"
          || bodyMethod === "resources/read"
          || bodyMethod === "prompts/get";

        if (isActionCall && !(req as any).auth && mcpConfig.security.strictMode) {
          const issuer = `${process.env.BACKEND_URL}${mcpConfig.http.endpoint}`;
          res.setHeader(
            "WWW-Authenticate",
            `Bearer realm="${issuer}", ` +
            `resource_metadata="${process.env.BACKEND_URL}/.well-known/oauth-protected-resource"`,
          );
          res.status(401).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Unauthorized: Bearer token required." },
            id: null,
          });
          return;
        }

        sessionManager.trackResponse(session, res);
        await session.transport.handleRequest(req, res, enrichedBody);
        return;
      }

      // 2. New Initialization Request
      if (isInitializeRequest(req.body)) {
        if (sessionManager.size >= mcpConfig.http.maxSessions) {
          res.status(503).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Too many open sessions on server. Please try again later.",
            },
            id: null,
          });
          return;
        }

        let initializedServer: ReturnType<typeof createMcpServerInstance> | undefined;

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            if (initializedServer) {
              sessionManager.registerSession(newSessionId, transport, initializedServer);
              const session = sessionManager.getSession(newSessionId);
              if (session) {
                sessionManager.trackResponse(session, res);
              }
            }
          },
        });

        initializedServer = createMcpServerInstance();
        await initializedServer.connect(transport);

        const enrichedInitBody = injectAuthIntoBody(req.body, (req as any).auth?.token);
        await transport.handleRequest(req, res, enrichedInitBody);
        return;
      }

      // 3. Invalid Request (Missing Session ID and not an initialize request)
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message:
            "Bad Request: No valid Mcp-Session-Id header provided and request is not an initialization request",
        },
        id: null,
      });
    } catch (error: any) {
      console.error("[MCP HTTP Transport] Error processing POST /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `Internal server error: ${error?.message || "Unknown error"}`,
          },
          id: null,
        });
      }
    }
  });

  // ─── GET /mcp (Standalone Server-Sent Events stream) ─────────────────────────
  app.get(endpoint, async (req: Request, res: Response): Promise<void> => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader)
      ? sessionIdHeader[0]
      : sessionIdHeader;

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: Mcp-Session-Id header is required to establish SSE stream",
        },
        id: null,
      });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Session not found or has expired. Please re-initialize.",
        },
        id: null,
      });
      return;
    }

    try {
      sessionManager.trackResponse(session, res);
      await session.transport.handleRequest(req, res);
    } catch (error: any) {
      console.error("[MCP HTTP Transport] Error processing GET /mcp SSE stream:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `Internal server error: ${error?.message || "Unknown error"}`,
          },
          id: null,
        });
      }
    }
  });

  // ─── DELETE /mcp (Explicit Session Termination) ──────────────────────────────
  app.delete(endpoint, async (req: Request, res: Response): Promise<void> => {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader)
      ? sessionIdHeader[0]
      : sessionIdHeader;

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: Mcp-Session-Id header is required to terminate session",
        },
        id: null,
      });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Session not found or already terminated",
        },
        id: null,
      });
      return;
    }

    try {
      sessionManager.trackResponse(session, res);
      await session.transport.handleRequest(req, res);
      await sessionManager.closeSession(sessionId);
    } catch (error: any) {
      console.error("[MCP HTTP Transport] Error processing DELETE /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `Internal server error: ${error?.message || "Unknown error"}`,
          },
          id: null,
        });
      }
    }
  });

  return app;
}
