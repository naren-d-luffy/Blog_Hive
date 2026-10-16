"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentResourceTemplates = exports.repliesByCommentTemplate = exports.commentsByBlogTemplate = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const comment_service_1 = require("../../../modules/Comment/comment.service");
const mcp_helpers_1 = require("../../utils/mcp.helpers");
const mcp_security_guard_1 = require("../../security/mcp.security.guard");
const mcp_config_1 = require("../../../config/mcp/mcp.config");
// ─── URI scheme ───────────────────────────────────────────────────────────────
//
//  Resource templates (dynamic URIs):
//    comment://blog/{blogId}            – root-level comments for a blog post
//    comment://replies/{commentId}      – replies nested under a specific comment
//
// ─────────────────────────────────────────────────────────────────────────────
/** comment://blog/{blogId} — root-level comments for a given blog post */
exports.commentsByBlogTemplate = {
    template: new mcp_js_1.ResourceTemplate("comment://blog/{blogId}", { list: undefined }),
    name: "Comments for Blog",
    description: "Returns the first page (up to 20) of root-level comments for a specific blog post, " +
        "identified by its MongoDB ObjectId. " +
        "Example URI: comment://blog/6630f1e2c1234abc567890ef",
    mimeType: "application/json",
    readHandler: (0, mcp_security_guard_1.guardTemplateResource)((async (uri, variables) => {
        const blogId = String(variables["blogId"] ?? "");
        try {
            const result = await comment_service_1.commentService.getComments(blogId, undefined, 20);
            return (0, mcp_helpers_1.formatResourceSuccess)(uri.href, result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    }), { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "comment://blog/{blogId}" }),
};
/** comment://replies/{commentId} — replies nested under a specific comment */
exports.repliesByCommentTemplate = {
    template: new mcp_js_1.ResourceTemplate("comment://replies/{commentId}", { list: undefined }),
    name: "Replies for Comment",
    description: "Returns the first page (up to 20) of reply comments nested under a specific parent comment, " +
        "identified by its MongoDB ObjectId. " +
        "Example URI: comment://replies/6630f1e2c1234abc567890ab",
    mimeType: "application/json",
    readHandler: (0, mcp_security_guard_1.guardTemplateResource)((async (uri, variables) => {
        const commentId = String(variables["commentId"] ?? "");
        try {
            const result = await comment_service_1.commentService.getReplies(commentId, undefined, 20);
            return (0, mcp_helpers_1.formatResourceSuccess)(uri.href, result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    }), { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "comment://replies/{commentId}" }),
};
// ─── Registries ───────────────────────────────────────────────────────────────
/** Templated (dynamic-URI) comment resources */
exports.commentResourceTemplates = [
    exports.commentsByBlogTemplate,
    exports.repliesByCommentTemplate,
];
