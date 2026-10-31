import env from "../env.config";

export const mcpConfig = {
  serverName: "blog-back-mcp",
  serverVersion: "1.0.0",

  transport: env.MCP_TRANSPORT,

  http: {
    port: env.MCP_PORT,
    host: env.MCP_HOST,
    endpoint: env.MCP_ENDPOINT,
    sessionIdleTimeoutMs: env.MCP_SESSION_IDLE_TIMEOUT_MS,
    maxSessions: env.MCP_MAX_SESSIONS,
    allowedHosts: env.MCP_ALLOWED_HOSTS,
    allowedOrigins: env.MCP_ALLOWED_ORIGINS,
  },

  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },

  security: {
    strictMode: env.MCP_STRICT_AUTH,
    allowEnvFallback: true,
  },

  description:
    "MCP server that exposes Blog and Comment management tools and resources for the Blog_Back API.",
} as const;

export type McpTransport = typeof mcpConfig.transport;
