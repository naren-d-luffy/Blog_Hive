import mongoose from "mongoose";
import AppError from "../../utils/AppError";
import checkId from "../../utils/CheckId";
import commentRepository from "./comment.repository";
import { blogService } from "../Blog/blog.service";
import { IComment } from "./comment.interface";
import { redisClient } from "../../config/redis.config";
import { decodeCursor, encodeCursor } from "../../utils/Cursor/cursor";
import type { CursorPaginationResult } from "../../types/cursor.types";

const deleteCacheByPatterns = async (patterns: string[]) => {
  for (const pattern of patterns) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
};

// Service
export const commentService = {
  // Sanitize
  sanitize(comment: Partial<IComment> | null) {
    if (!comment) return null;

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
  async createComment(
    blogId: string,
    userId: string,
    content: string,
    parentCommentId?: string,
  ) {
    checkId(blogId);
    checkId(userId);

    if (!content || content.trim().length === 0) {
      throw new AppError("Content is required", 400);
    }

    const blog = await blogService.getById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);

    let parentComment = null;

    if (parentCommentId) {
      checkId(parentCommentId);

      parentComment = await commentRepository.getCommentById(parentCommentId);
      if (!parentComment) throw new AppError("Parent comment not found", 404);
    }

    const newComment = await commentRepository.createComment({
      blogId: new mongoose.Types.ObjectId(blogId),
      content: content.trim(),
      createdBy: new mongoose.Types.ObjectId(userId),
      parentCommentId: parentCommentId
        ? new mongoose.Types.ObjectId(parentCommentId)
        : undefined,
    });

    if (!parentCommentId) {
      await blogService.attachComment(blogId, newComment._id.toString());
    } else {
      await commentRepository.incrementReplyCount(parentCommentId, 1);
      await deleteCacheByPatterns([`replies:${parentCommentId}:*`]);
    }

    await deleteCacheByPatterns([`comments:${blogId}:*`]);

    return this.sanitize(newComment);
  },

  //Get Root Comments
  async getComments(blogId: string, cursor: string | undefined, limit: number) {
    checkId(blogId);

    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `comments:${blogId}:cursor:${cursor ?? "initial"}:limit:${limit}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await commentRepository.getAllComments(
      blogId,
      decodedCursor,
      limit + 1,
    );

    const hasNextPage = data.length > limit;
    const comments = hasNextPage ? data.slice(0, limit) : data;

    const sanitizedData = comments.map((c) => this.sanitize(c)!);

    let nextCursor: string | null = null;

    if (hasNextPage) {
      const lastComment = comments.at(-1)!;
      nextCursor = encodeCursor({
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

    await redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
    return result;
  },

  //Get Replies
  async getReplies(commentId: string, cursor: string | undefined, limit: number) {
    checkId(commentId);

    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `replies:${commentId}:cursor:${cursor ?? "initial"}:limit:${limit}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await commentRepository.getReplies(
      commentId,
      decodedCursor,
      limit + 1,
    );

    const hasNextPage = data.length > limit;
    const replies = hasNextPage ? data.slice(0, limit) : data;

    const sanitizedData = replies.map((r) => this.sanitize(r)!);

    let nextCursor: string | null = null;

    if (hasNextPage) {
      const lastReply = replies.at(-1)!;
      nextCursor = encodeCursor({
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

    await redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
    return result;
  },

  // Update Comment
  async updateComment(commentId: string, userId: string, content: string) {
    checkId(commentId);
    checkId(userId);

    const existing = await commentRepository.getCommentById(commentId);
    if (!existing) throw new AppError("Comment not found", 404);

    if (existing.createdBy.toString() !== userId) {
      throw new AppError("Unauthorized", 403);
    }

    const updated = await commentRepository.updateComment(commentId, {
      content: content.trim(),
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    await deleteCacheByPatterns([
      `replies:${commentId}:*`,
      `comments:${existing.blogId}:*`,
      ...(existing.parentCommentId ? [`replies:${existing.parentCommentId}:*`] : []),
    ]);

    return this.sanitize(updated);
  },

  // Delete (Soft Delete)
  async deleteComment(commentId: string, userId: string) {
    checkId(commentId);
    checkId(userId);

    const existing = await commentRepository.getCommentById(commentId);
    if (!existing) throw new AppError("Comment not found", 404);

    const isOwner = existing.createdBy.toString() === userId;
    if (!isOwner) throw new AppError("Unauthorized", 403);

    const deleted = await commentRepository.softDelete(commentId, userId);

    // If root comment → detach from blog
    if (!existing.parentCommentId) {
      await blogService.detachComment(existing.blogId.toString(), commentId);
    } else {
      // decrement reply count
      await commentRepository.incrementReplyCount(
        existing.parentCommentId.toString(),
        -1,
      );
    }

    await deleteCacheByPatterns([
      `replies:${commentId}:*`,
      `comments:${existing.blogId}:*`,
      ...(existing.parentCommentId ? [`replies:${existing.parentCommentId}:*`] : []),
    ]);

    return { id: commentId, deleted: true };
  },

  // Like Comment
  async likeComment(commentId: string) {
    checkId(commentId);

    const comment = await commentRepository.getCommentById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);

    await commentRepository.incrementLikeCount(commentId, 1);

    return { liked: true };
  },

  async unlikeComment(commentId: string) {
    checkId(commentId);

    const comment = await commentRepository.getCommentById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);

    await commentRepository.incrementLikeCount(commentId, -1);

    return { unliked: true };
  },

  // Report Comment
  async reportComment(commentId: string) {
    checkId(commentId);

    const comment = await commentRepository.getCommentById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);

    await commentRepository.incrementReportCount(commentId, 1);

    return { reported: true };
  },
};
