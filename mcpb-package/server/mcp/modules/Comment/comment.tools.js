"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentTools = exports.reportCommentTool = exports.unlikeCommentTool = exports.likeCommentTool = exports.deleteCommentTool = exports.updateCommentTool = exports.getRepliesToolDef = exports.getCommentsTool = exports.createCommentTool = void 0;
const zod_1 = require("zod");
const comment_service_1 = require("../../../modules/Comment/comment.service");
const mcp_helpers_1 = require("../../utils/mcp.helpers");
const mcp_security_guard_1 = require("../../security/mcp.security.guard");
const mcp_config_1 = require("../../../config/mcp/mcp.config");
// ─── Shared sub-schemas ───────────────────────────────────────────────────────
const mongoId = zod_1.z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid 24-character MongoDB ObjectId");
const cursorPagination = zod_1.z.object({
    cursor: zod_1.z.string().optional().describe("Opaque pagination cursor from a previous response"),
    limit: zod_1.z.number().int().min(1).max(100).default(10).describe("Number of items per page (1–100)"),
});
// ─── Input schema types ───────────────────────────────────────────────────────
const createCommentSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog post being commented on"),
    userId: mongoId
        .optional()
        .describe("MongoDB ObjectId of user posting (optional: automatically bound from access token)"),
    content: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(250)
        .describe("Comment text (max 250 characters)"),
    parentCommentId: mongoId
        .optional()
        .describe("MongoDB ObjectId of the parent comment. Omit for root comments; supply for replies."),
});
const getCommentsSchema = cursorPagination.extend({
    blogId: mongoId.describe("MongoDB ObjectId of the blog post"),
});
const getRepliesSchema = cursorPagination.extend({
    commentId: mongoId.describe("MongoDB ObjectId of the parent comment"),
});
const updateCommentSchema = zod_1.z.object({
    commentId: mongoId.describe("MongoDB ObjectId of the comment to update"),
    userId: mongoId
        .optional()
        .describe("MongoDB ObjectId of comment owner (optional: automatically bound from token)"),
    content: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(250)
        .describe("New comment content (max 250 characters)"),
});
const deleteCommentSchema = zod_1.z.object({
    commentId: mongoId.describe("MongoDB ObjectId of the comment to delete"),
    userId: mongoId
        .optional()
        .describe("MongoDB ObjectId of owner (optional: automatically bound from token)"),
});
const likeCommentSchema = zod_1.z.object({
    commentId: mongoId.describe("MongoDB ObjectId of the comment to like"),
});
const unlikeCommentSchema = zod_1.z.object({
    commentId: mongoId.describe("MongoDB ObjectId of the comment to unlike"),
});
const reportCommentSchema = zod_1.z.object({
    commentId: mongoId.describe("MongoDB ObjectId of the comment to report"),
});
// ─── Comment Tool Definitions ─────────────────────────────────────────────────
exports.createCommentTool = {
    name: "create-comment",
    description: "[Protected] Creates a new comment on a blog post. Requires user authentication. " +
        "The commenter's identity is automatically verified from the access token. " +
        "Supply 'parentCommentId' to post a reply.",
    inputSchema: createCommentSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const authorId = context?.user.id ?? input.userId;
        const result = await comment_service_1.commentService.createComment(input.blogId, authorId, input.content, input.parentCommentId);
        return (0, mcp_helpers_1.formatToolSuccess)(result, 201);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "create-comment" }),
};
exports.getCommentsTool = {
    name: "get-comments",
    description: "Returns root-level (top-level) comments for a given blog post, " +
        "sorted by creation time newest-first. " +
        "Use the returned 'nextCursor' to fetch subsequent pages.",
    inputSchema: getCommentsSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await comment_service_1.commentService.getComments(input.blogId, input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-comments" }),
};
exports.getRepliesToolDef = {
    name: "get-replies",
    description: "Returns replies (child comments) nested under a specific parent comment. " +
        "Paginated with the same cursor strategy as get-comments.",
    inputSchema: getRepliesSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await comment_service_1.commentService.getReplies(input.commentId, input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-replies" }),
};
exports.updateCommentTool = {
    name: "update-comment",
    description: "[Protected] Updates the text content of a comment. Requires user authentication. " +
        "Only the original author may update their own comment.",
    inputSchema: updateCommentSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const authorId = context?.user.id ?? input.userId;
        const result = await comment_service_1.commentService.updateComment(input.commentId, authorId, input.content);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "update-comment" }),
};
exports.deleteCommentTool = {
    name: "delete-comment",
    description: "[Protected] Soft-deletes a comment. Requires user authentication. " +
        "Only the comment owner (or an admin) may delete a comment.",
    inputSchema: deleteCommentSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const authorId = context?.user.id ?? input.userId;
        const result = await comment_service_1.commentService.deleteComment(input.commentId, authorId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "delete-comment" }),
};
exports.likeCommentTool = {
    name: "like-comment",
    description: "[Protected] Increments the like counter on a comment by 1. Requires authentication.",
    inputSchema: likeCommentSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await comment_service_1.commentService.likeComment(input.commentId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "like-comment" }),
};
exports.unlikeCommentTool = {
    name: "unlike-comment",
    description: "[Protected] Decrements the like counter on a comment by 1. Requires authentication.",
    inputSchema: unlikeCommentSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await comment_service_1.commentService.unlikeComment(input.commentId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "unlike-comment" }),
};
exports.reportCommentTool = {
    name: "report-comment",
    description: "[Protected] Increments the report counter on a comment for moderation. Requires authentication.",
    inputSchema: reportCommentSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await comment_service_1.commentService.reportComment(input.commentId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "report-comment" }),
};
// ─── Registry ─────────────────────────────────────────────────────────────────
exports.commentTools = [
    exports.createCommentTool,
    exports.getCommentsTool,
    exports.getRepliesToolDef,
    exports.updateCommentTool,
    exports.deleteCommentTool,
    exports.likeCommentTool,
    exports.unlikeCommentTool,
    exports.reportCommentTool,
];
