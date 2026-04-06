import { blogRepository } from "./blog.repository";
import { blogQueue } from "../../config/queue.config"; // Must be a `Queue` instance — see note below
import { IBlog } from "./blog.interface";
import AppError from "../../utils/AppError";
import checkId from "../../utils/CheckId";
import { generateUniqueSlug } from "../../utils/slug";
import { calculatePopularity } from "../../utils/calculatePopularity";
import { CreateBlogInput, UpdateBlogInput } from "./blog.validation";
import { BLOG_JOBS } from "../../queues/blog.queue";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT — queue.config.ts must export a `Queue`, not a `QueueEvents`.
// QueueEvents is a listener only and has no .add() method.
//
//   import { Queue, QueueEvents } from "bullmq";
//   export const blogQueue       = new Queue("blog", { connection });
//   export const blogQueueEvents = new QueueEvents("blog", { connection });
//
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const QUEUE_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
};

// ─────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────

export const blogService = {
  // ── Sanitize ──────────────────────────────────────

  sanitizeBlog(blog: Partial<IBlog> | null) {
    if (!blog) return null;
    return {
      id: blog._id,
      heading: blog.heading,
      slug: blog.slug,
      category: blog.category,
      tags: blog.tags,
      status: blog.status,
      views: blog.views,
      likeCount: blog.likeCount,
      commentCount: blog.commentCount,
      popularityScore: blog.popularityScore,
      createdBy: blog.createdBy,
      updatedBy: blog.updatedBy,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    };
  },

  // ── Pagination envelope ───────────────────────────

  buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return { data, total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
  },

  // ── Create ────────────────────────────────────────

  async createBlog(blogData: CreateBlogInput, id:string) {
    // generateUniqueSlug(heading, excludedId?)
    // No excludedId on creation — pass heading only
    const slug = await generateUniqueSlug(blogData.heading);

    const newBlog = await blogRepository.create({
      ...blogData,
      slug,
      createdBy: new mongoose.Types.ObjectId(id),
    });

    return this.sanitizeBlog(newBlog);
  },

  // ── Read (lists) ──────────────────────────────────

  async getAllBlogs(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([blogRepository.findAll(skip, limit), blogRepository.totalCount()]);
    return this.buildPaginatedResponse(data.map((b) => this.sanitizeBlog(b)!), total, page, limit);
  },

  async getAllByPopularity(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([blogRepository.findAllByPolularity(skip, limit), blogRepository.totalCount()]);
    return this.buildPaginatedResponse(data.map((b) => this.sanitizeBlog(b)!), total, page, limit);
  },

  async getAllByCategory(category: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([blogRepository.findByCategory(category, skip, limit), blogRepository.countByCategory(category)]);
    return this.buildPaginatedResponse(data.map((b) => this.sanitizeBlog(b)!), total, page, limit);
  },

  async getAllByTag(tag: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([blogRepository.findByTag(tag, skip, limit), blogRepository.countByTag(tag)]);
    return this.buildPaginatedResponse(data.map((b) => this.sanitizeBlog(b)!), total, page, limit);
  },

  async getAllByAuthor(userId: string, page: number, limit: number) {
    checkId(userId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([blogRepository.findByAuthor(userId, skip, limit), blogRepository.countByAuthor(userId)]);
    return this.buildPaginatedResponse(data.map((b) => this.sanitizeBlog(b)!), total, page, limit);
  },

  async searchBlogs(query: string, page: number, limit: number) {
    if (!query || query.trim().length < 2) throw new AppError("Search query must be at least 2 characters", 400);
    const skip = (page - 1) * limit;
    const trimmedQuery = query.trim();
    const [data, total] = await Promise.all([blogRepository.search(trimmedQuery, skip, limit), blogRepository.countSearch(trimmedQuery)]);
    return this.buildPaginatedResponse(data.map((b) => this.sanitizeBlog(b)!), total, page, limit);
  },

  // ── Read (single) ─────────────────────────────────

  async getById(blogId: string) {
    checkId(blogId);
    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);
    return this.sanitizeBlog(blog);
  },

  async getBySlug(slug: string) {
    if (!slug || slug.trim().length === 0) throw new AppError("Slug is required", 400);
    const blog = await blogRepository.findBySlug(slug.trim());
    if (!blog) throw new AppError("Blog not found", 404);
    return this.sanitizeBlog(blog);
  },

  // ── Update ────────────────────────────────────────

  async updateBlog(blogId: string, updateData: UpdateBlogInput, requesterId: string, requesterRole: "User" | "Admin") {
    checkId(blogId);
    checkId(requesterId);

    const existing = await blogRepository.findById(blogId);
    if (!existing) throw new AppError("Blog not found", 404);

    const isOwner = existing.createdBy.toString() === requesterId;
    if (!isOwner && requesterRole !== "Admin") throw new AppError("Forbidden: you do not own this blog", 403);

    // generateUniqueSlug(heading, excludedId?) — pass blogId as second arg so the
    // current slug is excluded from the uniqueness check during updates.
    let slug = existing.slug;
    if (updateData.heading && updateData.heading !== existing.heading) {
      slug = await generateUniqueSlug(updateData.heading,{excludedId: blogId});
    }

    const updated = await blogRepository.update(blogId, {
      ...updateData,
      slug,
      updatedBy: new mongoose.Types.ObjectId(requesterId),
    });

    if (!updated) throw new AppError("Blog update failed", 500);

    const newScore = calculatePopularity(updated);
    await blogRepository.updatePopularityScore(blogId, newScore);

    return this.sanitizeBlog(updated);
  },

  // ── Delete ────────────────────────────────────────

  async deleteBlog(blogId: string, requesterId: string, requesterRole: "User" | "Admin") {
    checkId(blogId);
    checkId(requesterId);

    const existing = await blogRepository.findById(blogId);
    if (!existing) throw new AppError("Blog not found", 404);

    const isOwner = existing.createdBy.toString() === requesterId;
    if (!isOwner && requesterRole !== "Admin") throw new AppError("Forbidden: you do not own this blog", 403);

    const deleted = await blogRepository.softDelete(blogId, requesterId, requesterRole);
    if (!deleted) throw new AppError("Blog deletion failed", 500);

    return { id: blogId, deleted: true };
  },

  // ── Interactions ──────────────────────────────────

  async trackView(blogId: string) {
    checkId(blogId);
    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);
    await blogRepository.incrementView(blogId).lean();
    await blogQueue.add(BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
  },

  async likeBlog(blogId: string, userId: string) {
    checkId(blogId);
    checkId(userId);

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);

    const result = await blogRepository.incrementLike(blogId, userId);
    if (result.modifiedCount === 0) throw new AppError("You have already liked this blog", 409);

    await blogQueue.add(BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
    return { liked: true };
  },

  async unlikeBlog(blogId: string, userId: string) {
    checkId(blogId);
    checkId(userId);

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);

    const result = await blogRepository.decrementLikes(blogId, userId);
    if (result.modifiedCount === 0) throw new AppError("You have not liked this blog", 409);

    await blogQueue.add(BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
    return { unliked: true };
  },

  async reportBlog(blogId: string) {
    checkId(blogId);
    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);
    await blogRepository.incrementReport(blogId);
    return { reported: true };
  },

  // ── Comment helpers (called by CommentService) ────

  async attachComment(blogId: string, commentId: string) {
    checkId(blogId);
    checkId(commentId);
    await blogRepository.addComment(blogId, commentId);
    await blogQueue.add(BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
  },

  async detachComment(blogId: string, commentId: string) {
    checkId(blogId);
    checkId(commentId);
    await blogRepository.removeComment(blogId, commentId);
  },

  // ── Popularity (called by queue worker) ──────────

  async recalculatePopularity(blogId: string) {
    checkId(blogId);
    const blog = await blogRepository.findById(blogId);
    if (!blog) return; // Already deleted — silently skip
    const score = calculatePopularity(blog);
    await blogRepository.updatePopularityScore(blogId, score);
  },
};