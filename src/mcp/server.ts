import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZodRawShape } from "zod";

import connectDB from "../config/db.config";
import { mcpConfig } from "../config/mcp/mcp.config";
import { blogTools } from "./modules/Blog/blog.tools";
import { commentTools } from "./modules/Comment/comment.tools";

function registerTools(
  server: McpServer,
  tools: ReadonlyArray<{
    name: string;
    description: string;
    inputSchema: { shape: ZodRawShape } & object;
    handler: (input: any) => Promise<any>;
  }>,
): void {
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      (tool.inputSchema as any).shape as ZodRawShape,
      tool.handler,
    );
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  await connectDB();
  console.error("[MCP] MongoDB connected");

  const server = new McpServer(
    {
      name: mcpConfig.serverName,
      version: mcpConfig.serverVersion,
    },
    {
      capabilities: mcpConfig.capabilities,
    },
  );

  registerTools(server, blogTools as any);
  registerTools(server, commentTools as any);

  const totalTools = blogTools.length + commentTools.length;
  console.error(`[MCP] Registered ${totalTools} tools (${blogTools.length} blog, ${commentTools.length} comment)`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[MCP] Server connected via stdio – ready for requests");

  const shutdown = async (signal: string) => {
    console.error(`[MCP] ${signal} received – closing server`);
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("[MCP] Fatal startup error:", err);
  process.exit(1);
});
