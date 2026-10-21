import {
  McpServer,
  ResourceTemplate,
  ReadResourceCallback,
  ReadResourceTemplateCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodRawShape } from "zod";

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

// ─── Prompts ─────────────────────────────────────────────────────────────────
import { blogPrompts } from "./modules/Blog/blog.prompts";
import { commentPrompts } from "./modules/Comment/comment.prompts";

function registerTools(
  server: McpServer,
  tools: ReadonlyArray<{
    name: string;
    description: string;
    inputSchema: { shape: ZodRawShape } & object;
    handler: (input: any, extra?: any) => Promise<any>;
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

function registerPrompts(
  server: McpServer,
  prompts: ReadonlyArray<{
    name: string;
    description: string;
    argsSchema?: ZodRawShape;
    handler: (input: any, extra?: any) => Promise<any>;
  }>,
): void {
  for (const prompt of prompts) {
    if (prompt.argsSchema) {
      server.prompt(
        prompt.name,
        prompt.description,
        prompt.argsSchema as any,
        prompt.handler,
      );
    } else {
      server.prompt(prompt.name, prompt.description, prompt.handler);
    }
  }
}

/**
 * Creates and initializes a fresh McpServer instance with all tools, resources, and prompts registered.
 *
 * Each stateful Streamable HTTP session or STDIO transport requires its
 * own McpServer instance to prevent cross-session protocol collisions.
 */
export function createMcpServerInstance(): McpServer {
  const server = new McpServer(
    {
      name: mcpConfig.serverName,
      version: mcpConfig.serverVersion,
    },
    {
      capabilities: mcpConfig.capabilities,
    },
  );

  // Tools
  registerTools(server, blogTools as any);
  registerTools(server, commentTools as any);

  // Resources
  registerResources(
    server,
    [...blogStaticResources],
    [...blogResourceTemplates, ...commentResourceTemplates],
  );

  // Prompts
  registerPrompts(server, [...blogPrompts, ...commentPrompts] as any);

  return server;
}

export const mcpCatalogStats = {
  toolsCount: blogTools.length + commentTools.length,
  blogToolsCount: blogTools.length,
  commentToolsCount: commentTools.length,
  staticResourcesCount: blogStaticResources.length,
  templateResourcesCount: blogResourceTemplates.length + commentResourceTemplates.length,
  promptsCount: blogPrompts.length + commentPrompts.length,
};
