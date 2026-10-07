"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.updateCommentSchema = exports.createCommentSchema = void 0;
const zod_1 = require("zod");
// Create Comment
exports.createCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z
            .string()
            .trim()
            .min(1, "Content is required")
            .max(250, "Comment cannot exceed 250 characters"),
        parentCommentId: zod_1.z.string().optional(),
    }),
    params: zod_1.z.object({
        blogId: zod_1.z.string(),
    }),
});
// Update Comment
exports.updateCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z
            .string()
            .trim()
            .min(1, "Content is required")
            .max(250, "Comment cannot exceed 250 characters"),
    }),
    params: zod_1.z.object({
        commentId: zod_1.z.string(),
    }),
});
// Pagination (for get)
exports.paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        cursor: zod_1.z.string().optional(),
        page: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
    }),
});
