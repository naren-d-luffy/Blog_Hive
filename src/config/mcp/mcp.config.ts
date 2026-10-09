export const mcpConfig = {
  serverName: "blog-back-mcp",
  serverVersion: "1.0.0",

  transport: "stdio" as const,

  capabilities: {
    tools: {},
    resources: {},
    // prompts: {},   // ← uncomment when prompt definitions are added
  },

  description:
    "MCP server that exposes Blog and Comment management tools and resources for the Blog_Back API.",
} as const;

export type McpTransport = typeof mcpConfig.transport;
