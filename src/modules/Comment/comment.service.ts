import mongoose from "mongoose";
import AppError from "../../utils/AppError";
import checkId from "../../utils/CheckId";
import commentRepository from "./comment.repository";
import { blogService } from "../Blog/blog.service";
import { IComment } from "./comment.interface";
import redisClient from "../../config/redis.config";
import { json } from "zod";

// Types
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total?: number;
  hasNextPage: boolean;
}

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

  //Pagination helper
  buildPagination<T>(
    data: T[],
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      data,
      page,
      limit,
      hasNextPage: data.length === limit,
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
    }

    return this.sanitize(newComment);
  },

  //Get Root Comments
  async getComments(blogId: string, page = 1, limit = 10) {
    checkId(blogId);

    const skip = (page - 1) * limit;
    const key = `comments:${blogId}:${page}:${limit}`;

    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const comments = await commentRepository.getAllComments(
      blogId,
      skip,
      limit,
    );

    const result = this.buildPagination(
      comments.map((c) => this.sanitize(c)!),
      page,
      limit,
    );

    await redisClient.set(key, JSON.stringify(result), { EX: 60 });
    return result;
  },

  //Get Replies
  async getReplies(commentId: string, page = 1, limit = 10) {
    checkId(commentId);

    const skip = (page - 1) * limit;

    const key = `replies:${commentId}:${page}:${limit}`;
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const replies = await commentRepository.getReplies(commentId, skip, limit);

    const result = this.buildPagination(
      replies.map((r) => this.sanitize(r)!),
      page,
      limit,
    );

    await redisClient.set(key, JSON.stringify(result), { EX: 60 });
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

    await redisClient.del(`replies:${commentId}:*`);

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

    await redisClient.del(`replies:${commentId}:*`);

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
