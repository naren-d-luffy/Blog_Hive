"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const db_config_1 = __importDefault(require("../config/db.config"));
const mcp_config_1 = require("../config/mcp/mcp.config");
const blog_tools_1 = require("./modules/Blog/blog.tools");
const comment_tools_1 = require("./modules/Comment/comment.tools");
function registerTools(server, tools) {
    for (const tool of tools) {
        server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.handler);
    }
}
// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap() {
    await (0, db_config_1.default)();
    console.error("[MCP] MongoDB connected");
    const server = new mcp_js_1.McpServer({
        name: mcp_config_1.mcpConfig.serverName,
        version: mcp_config_1.mcpConfig.serverVersion,
    }, {
        capabilities: mcp_config_1.mcpConfig.capabilities,
    });
    registerTools(server, blog_tools_1.blogTools);
    registerTools(server, comment_tools_1.commentTools);
    const totalTools = blog_tools_1.blogTools.length + comment_tools_1.commentTools.length;
    console.error(`[MCP] Registered ${totalTools} tools (${blog_tools_1.blogTools.length} blog, ${comment_tools_1.commentTools.length} comment)`);
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] Server connected via stdio – ready for requests");
    const shutdown = async (signal) => {
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
