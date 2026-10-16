"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpConfig = void 0;
exports.mcpConfig = {
    serverName: "blog-back-mcp",
    serverVersion: "1.0.0",
    transport: "stdio",
    capabilities: {
        tools: {},
        resources: {},
        prompts: {},
    },
    security: {
        strictMode: process.env.MCP_STRICT_AUTH === "true",
        allowEnvFallback: true,
    },
    description: "MCP server that exposes Blog and Comment management tools and resources for the Blog_Back API.",
};
