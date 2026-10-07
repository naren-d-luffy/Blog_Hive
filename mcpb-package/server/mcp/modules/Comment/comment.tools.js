"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentTools = exports.reportCommentTool = exports.unlikeCommentTool = exports.likeCommentTool = exports.deleteCommentTool = exports.updateCommentTool = exports.getRepliesToolDef = exports.getCommentsTool = exports.createCommentTool = void 0;
const zod_1 = require("zod");
const comment_service_1 = require("../../../modules/Comment/comment.service");
const mcp_helpers_1 = require("../../utils/mcp.helpers");
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
    userId: mongoId.describe("MongoDB ObjectId of the user posting the comment"),
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
    userId: mongoId.describe("MongoDB ObjectId of the comment owner making the update"),
    content: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(250)
        .describe("New comment content (max 250 characters)"),
});
const deleteCommentSchema = zod_1.z.object({
    commentId: mongoId.describe("MongoDB ObjectId of the comment to delete"),
    userId: mongoId.describe("MongoDB ObjectId of the owner requesting deletion"),
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
    description: "Creates a new comment on a blog post. " +
        "If 'parentCommentId' is supplied the comment is treated as a reply and the " +
        "parent's reply counter is incremented. " +
        "Root comments are automatically attached to the blog.",
    inputSchema: createCommentSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.createComment(input.blogId, input.userId, input.content, input.parentCommentId);
            return (0, mcp_helpers_1.formatToolSuccess)(result, 201);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getCommentsTool = {
    name: "get-comments",
    description: "Returns root-level (top-level) comments for a given blog post, " +
        "sorted by creation time newest-first. " +
        "Use the returned 'nextCursor' to fetch subsequent pages.",
    inputSchema: getCommentsSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.getComments(input.blogId, input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getRepliesToolDef = {
    name: "get-replies",
    description: "Returns replies (child comments) nested under a specific parent comment. " +
        "Paginated with the same cursor strategy as get-comments.",
    inputSchema: getRepliesSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.getReplies(input.commentId, input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.updateCommentTool = {
    name: "update-comment",
    description: "Updates the text content of a comment. " +
        "Only the original author (userId) may update their own comment. " +
        "Throws 403 if the userId does not match the comment owner.",
    inputSchema: updateCommentSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.updateComment(input.commentId, input.userId, input.content);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.deleteCommentTool = {
    name: "delete-comment",
    description: "Soft-deletes a comment (marks it deleted, does NOT erase from the database). " +
        "Root comments are detached from the parent blog. " +
        "Reply comments decrement the parent's reply count. " +
        "Only the comment owner may call this.",
    inputSchema: deleteCommentSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.deleteComment(input.commentId, input.userId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.likeCommentTool = {
    name: "like-comment",
    description: "Increments the like counter on a comment by 1. " +
        "No de-duplication at the service layer – the caller is responsible for " +
        "ensuring a user doesn't double-like (auth layer concern).",
    inputSchema: likeCommentSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.likeComment(input.commentId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.unlikeCommentTool = {
    name: "unlike-comment",
    description: "Decrements the like counter on a comment by 1.",
    inputSchema: unlikeCommentSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.unlikeComment(input.commentId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.reportCommentTool = {
    name: "report-comment",
    description: "Increments the report counter on a comment for moderation. " +
        "High report counts can trigger manual review.",
    inputSchema: reportCommentSchema,
    handler: async (input) => {
        try {
            const result = await comment_service_1.commentService.reportComment(input.commentId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
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
