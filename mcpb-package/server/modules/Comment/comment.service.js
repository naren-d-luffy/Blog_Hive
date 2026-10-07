"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AppError_1 = __importDefault(require("../../utils/AppError"));
const CheckId_1 = __importDefault(require("../../utils/CheckId"));
const comment_repository_1 = __importDefault(require("./comment.repository"));
const blog_service_1 = require("../Blog/blog.service");
const redis_config_1 = require("../../config/redis.config");
const cursor_1 = require("../../utils/Cursor/cursor");
const deleteCacheByPatterns = async (patterns) => {
    for (const pattern of patterns) {
        const keys = await redis_config_1.redisClient.keys(pattern);
        if (keys.length > 0) {
            await redis_config_1.redisClient.del(...keys);
        }
    }
};
// Service
exports.commentService = {
    // Sanitize
    sanitize(comment) {
        if (!comment)
            return null;
        return {
            id: comment._id,
            blogId: comment.blogId,
            content: comment.content,
            createdBy: comment.createdBy,
            parentCommentId: comment.parentCommentId,
            likeCount: comment.likeCount,
            replyCount: comment.replyCount,
            reportCount: comment.reportCount,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
        };
    },
    //Create Comment / Reply
    async createComment(blogId, userId, content, parentCommentId) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(userId);
        if (!content || content.trim().length === 0) {
            throw new AppError_1.default("Content is required", 400);
        }
        const blog = await blog_service_1.blogService.getById(blogId);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        let parentComment = null;
        if (parentCommentId) {
            (0, CheckId_1.default)(parentCommentId);
            parentComment = await comment_repository_1.default.getCommentById(parentCommentId);
            if (!parentComment)
                throw new AppError_1.default("Parent comment not found", 404);
        }
        const newComment = await comment_repository_1.default.createComment({
            blogId: new mongoose_1.default.Types.ObjectId(blogId),
            content: content.trim(),
            createdBy: new mongoose_1.default.Types.ObjectId(userId),
            parentCommentId: parentCommentId
                ? new mongoose_1.default.Types.ObjectId(parentCommentId)
                : undefined,
        });
        if (!parentCommentId) {
            await blog_service_1.blogService.attachComment(blogId, newComment._id.toString());
        }
        else {
            await comment_repository_1.default.incrementReplyCount(parentCommentId, 1);
            await deleteCacheByPatterns([`replies:${parentCommentId}:*`]);
        }
        await deleteCacheByPatterns([`comments:${blogId}:*`]);
        return this.sanitize(newComment);
    },
    //Get Root Comments
    async getComments(blogId, cursor, limit) {
        (0, CheckId_1.default)(blogId);
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `comments:${blogId}:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const data = await comment_repository_1.default.getAllComments(blogId, decodedCursor, limit + 1);
        const hasNextPage = data.length > limit;
        const comments = hasNextPage ? data.slice(0, limit) : data;
        const sanitizedData = comments.map((c) => this.sanitize(c));
        let nextCursor = null;
        if (hasNextPage) {
            const lastComment = comments.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
                createdAt: lastComment.createdAt.toISOString(),
                id: lastComment._id.toString(),
            });
        }
        const result = {
            sanitizedData,
            limit,
            hasNextPage,
            nextCursor,
        };
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    //Get Replies
    async getReplies(commentId, cursor, limit) {
        (0, CheckId_1.default)(commentId);
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `replies:${commentId}:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const data = await comment_repository_1.default.getReplies(commentId, decodedCursor, limit + 1);
        const hasNextPage = data.length > limit;
        const replies = hasNextPage ? data.slice(0, limit) : data;
        const sanitizedData = replies.map((r) => this.sanitize(r));
        let nextCursor = null;
        if (hasNextPage) {
            const lastReply = replies.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
                createdAt: lastReply.createdAt.toISOString(),
                id: lastReply._id.toString(),
            });
        }
        const result = {
            sanitizedData,
            limit,
            hasNextPage,
            nextCursor,
        };
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    // Update Comment
    async updateComment(commentId, userId, content) {
        (0, CheckId_1.default)(commentId);
        (0, CheckId_1.default)(userId);
        const existing = await comment_repository_1.default.getCommentById(commentId);
        if (!existing)
            throw new AppError_1.default("Comment not found", 404);
        if (existing.createdBy.toString() !== userId) {
            throw new AppError_1.default("Unauthorized", 403);
        }
        const updated = await comment_repository_1.default.updateComment(commentId, {
            content: content.trim(),
            updatedBy: new mongoose_1.default.Types.ObjectId(userId),
        });
        await deleteCacheByPatterns([
            `replies:${commentId}:*`,
            `comments:${existing.blogId}:*`,
            ...(existing.parentCommentId ? [`replies:${existing.parentCommentId}:*`] : []),
        ]);
        return this.sanitize(updated);
    },
    // Delete (Soft Delete)
    async deleteComment(commentId, userId) {
        (0, CheckId_1.default)(commentId);
        (0, CheckId_1.default)(userId);
        const existing = await comment_repository_1.default.getCommentById(commentId);
        if (!existing)
            throw new AppError_1.default("Comment not found", 404);
        const isOwner = existing.createdBy.toString() === userId;
        if (!isOwner)
            throw new AppError_1.default("Unauthorized", 403);
        const deleted = await comment_repository_1.default.softDelete(commentId, userId);
        // If root comment → detach from blog
        if (!existing.parentCommentId) {
            await blog_service_1.blogService.detachComment(existing.blogId.toString(), commentId);
        }
        else {
            // decrement reply count
            await comment_repository_1.default.incrementReplyCount(existing.parentCommentId.toString(), -1);
        }
        await deleteCacheByPatterns([
            `replies:${commentId}:*`,
            `comments:${existing.blogId}:*`,
            ...(existing.parentCommentId ? [`replies:${existing.parentCommentId}:*`] : []),
        ]);
        return { id: commentId, deleted: true };
    },
    // Like Comment
    async likeComment(commentId) {
        (0, CheckId_1.default)(commentId);
        const comment = await comment_repository_1.default.getCommentById(commentId);
        if (!comment)
            throw new AppError_1.default("Comment not found", 404);
        await comment_repository_1.default.incrementLikeCount(commentId, 1);
        return { liked: true };
    },
    async unlikeComment(commentId) {
        (0, CheckId_1.default)(commentId);
        const comment = await comment_repository_1.default.getCommentById(commentId);
        if (!comment)
            throw new AppError_1.default("Comment not found", 404);
        await comment_repository_1.default.incrementLikeCount(commentId, -1);
        return { unliked: true };
    },
    // Report Comment
    async reportComment(commentId) {
        (0, CheckId_1.default)(commentId);
        const comment = await comment_repository_1.default.getCommentById(commentId);
        if (!comment)
            throw new AppError_1.default("Comment not found", 404);
        await comment_repository_1.default.incrementReportCount(commentId, 1);
        return { reported: true };
    },
};
