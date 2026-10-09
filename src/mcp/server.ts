import { McpServer, ResourceTemplate, ReadResourceCallback, ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZodRawShape } from "zod";

import connectDB from "../config/db.config";
import { mcpConfig } from "../config/mcp/mcp.config";

// ─── Tools ────────────────────────────────────────────────────────────────────
import { blogTools } from "./modules/Blog/blog.tools";
import { commentTools } from "./modules/Comment/comment.tools";

// ─── Resources ────────────────────────────────────────────────────────────────
import {
  blogStaticResources,
  blogResourceTemplates,
} from "./modules/Blog/blog.resources";
import { commentResourceTemplates } from "./modules/Comment/comment.resources";

// ─── Prompts (reserved for future use) ───────────────────────────────────────
// import { blogPrompts }    from "./modules/Blog/blog.prompts";
// import { commentPrompts } from "./modules/Comment/comment.prompts";

// ─── Registration helpers ─────────────────────────────────────────────────────

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

function registerResources(
  server: McpServer,
  staticResources: ReadonlyArray<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    readHandler: ReadResourceCallback;
  }>,
  templateResources: ReadonlyArray<{
    template: ResourceTemplate;
    name: string;
    description: string;
    mimeType: string;
    readHandler: ReadResourceTemplateCallback;
  }>,
): void {
  for (const res of staticResources) {
    server.resource(
      res.name,
      res.uri,
      { description: res.description, mimeType: res.mimeType },
      res.readHandler,
    );
  }

  for (const res of templateResources) {
    server.resource(
      res.name,
      res.template,
      { description: res.description, mimeType: res.mimeType },
      res.readHandler,
    );
  }
}

// ─── Prompts registration stub ────────────────────────────────────────────────
// Uncomment and fill in when prompt definitions are ready.
//
// function registerPrompts(
//   server: McpServer,
//   prompts: ReadonlyArray<{
//     name: string;
//     description: string;
//     argsSchema: ZodRawShape;
//     handler: (input: any) => Promise<any>;
//   }>,
// ): void {
//   for (const prompt of prompts) {
//     server.prompt(prompt.name, prompt.description, prompt.argsSchema, prompt.handler);
//   }
// }

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

  // ── Tools ──
  registerTools(server, blogTools as any);
  registerTools(server, commentTools as any);

  const totalTools = blogTools.length + commentTools.length;
  console.error(
    `[MCP] Registered ${totalTools} tools (${blogTools.length} blog, ${commentTools.length} comment)`,
  );

  // ── Resources ──
  registerResources(
    server,
    [...blogStaticResources],
    [...blogResourceTemplates, ...commentResourceTemplates],
  );

  const totalStaticResources = blogStaticResources.length;
  const totalTemplateResources = blogResourceTemplates.length + commentResourceTemplates.length;
  console.error(
    `[MCP] Registered ${totalStaticResources} static resources and ${totalTemplateResources} resource templates`,
  );

  // ── Prompts (reserved) ──
  // registerPrompts(server, [...blogPrompts, ...commentPrompts]);

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
