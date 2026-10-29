import http from "node:http";
import mongoose from "mongoose";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import connectDB from "../config/db.config";
import { mcpConfig } from "../config/mcp/mcp.config";
import { createMcpServerInstance, mcpCatalogStats } from "./server.factory";
import { SessionManager } from "./transports/session.manager";
import { createMcpHttpApp } from "./transports/http.transport";

let httpServer: http.Server | undefined;
let activeSessionManager: SessionManager | undefined;

/**
 * Boots the Dedicated MCP Server.
 * Supports both modern Streamable HTTP (production default) and STDIO.
 */
async function bootstrap(): Promise<void> {
  console.log("[MCP] Bootstrap starting");
  console.log("[MCP] Transport:", mcpConfig.transport);
  console.log("[MCP] PORT:", process.env.PORT);
  console.log("[MCP] MCP_PORT:", mcpConfig.http.port);

  console.log("[MCP] Connecting to MongoDB...");
  // 1. Connect MongoDB
  await connectDB();
  console.error("[MCP] MongoDB connected successfully");

  // 2. Display Catalog Summary
  console.error(
    `[MCP] Catalog ready: ${mcpCatalogStats.toolsCount} tools (${mcpCatalogStats.blogToolsCount} blog, ${mcpCatalogStats.commentToolsCount} comment), ` +
      `${mcpCatalogStats.staticResourcesCount} static resources, ${mcpCatalogStats.templateResourcesCount} resource templates, ` +
      `${mcpCatalogStats.promptsCount} prompts`,
  );
  console.error(
    `[MCP] Security: strictMode=${mcpConfig.security.strictMode}, allowEnvFallback=${mcpConfig.security.allowEnvFallback}`,
  );

  // 3. Start Selected Transport
  if (mcpConfig.transport === "streamable-http") {
    await startStreamableHttpServer();
  } else {
    await startStdioServer();
  }
}

/**
 * Starts the production Streamable HTTP server with session management.
 */
async function startStreamableHttpServer(): Promise<void> {
  const sessionManager = new SessionManager(mcpConfig.http.sessionIdleTimeoutMs);
  activeSessionManager = sessionManager;
  sessionManager.startIdleSweeper();

  const app = createMcpHttpApp(sessionManager);
  const port = Number(process.env.PORT) || mcpConfig.http.port;
  const { host, endpoint } = mcpConfig.http;

  httpServer = app.listen(port, host, () => {
    console.error(
      `\n` +
        `╔═════════════════════════════════════════════════════════════════════════╗\n` +
        `║                  blog-back MCP Streamable HTTP Server                   ║\n` +
        `╠═════════════════════════════════════════════════════════════════════════╣\n` +
        `║  Status:         LISTENING                                              ║\n` +
        `║  Transport:      Streamable HTTP (MCP 2025 Standard)                    ║\n` +
        `║  Endpoint:       http://${host}:${port}${endpoint.padEnd(39)}║\n` +
        `║  Health check:   http://${host}:${port}/health${"".padEnd(38)}║\n` +
        `║  Max Sessions:   ${String(mcpConfig.http.maxSessions).padEnd(55)}║\n` +
        `║  Idle Timeout:   ${String(mcpConfig.http.sessionIdleTimeoutMs / 60000) + " minutes"}`.padEnd(74) +
        `║\n` +
        `╚═════════════════════════════════════════════════════════════════════════╝\n`,
    );
  });

  registerGracefulShutdown();
}

/**
 * Fallback STDIO server runner (for single-process local debugging or direct child process invocation).
 */
async function startStdioServer(): Promise<void> {
  const server = createMcpServerInstance();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[MCP] Connected via STDIO transport – awaiting messages");

  const shutdown = async (signal: string) => {
    console.error(`[MCP] ${signal} received – closing STDIO server`);
    await server.close();
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

/**
 * Registers process signal handlers to ensure active sessions and connections close gracefully.
 */
function registerGracefulShutdown(): void {
  let isShuttingDown = false;

  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.error(`\n[MCP] ${signal} received – starting graceful shutdown...`);

    // 1. Stop accepting new HTTP requests
    if (httpServer) {
      httpServer.close(() => {
        console.error("[MCP] HTTP server stopped accepting connections");
      });
    }

    // 2. Terminate all active client transports and servers
    if (activeSessionManager) {
      console.error(
        `[MCP] Draining ${activeSessionManager.size} active client sessions...`,
      );
      await activeSessionManager.closeAll();
      console.error("[MCP] All sessions terminated");
    }

    // 3. Close database connection
    try {
      await mongoose.connection.close();
      console.error("[MCP] MongoDB connection closed");
    } catch (err) {
      console.error("[MCP] Error closing MongoDB connection:", err);
    }

    console.error("[MCP] Graceful shutdown complete. Exiting.");
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("[MCP] Fatal startup error:", err);
  process.exit(1);
});
