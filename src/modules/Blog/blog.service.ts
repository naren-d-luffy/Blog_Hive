import { blogRepository } from "./blog.repository";
import { blogQueue } from "../../config/queue.config";
import { IBlog } from "./blog.interface";
import AppError from "../../utils/AppError";
import checkId from "../../utils/CheckId";
import { generateUniqueSlug } from "../../utils/slug";
import { calculatePopularity } from "../../utils/calculatePopularity";
import { CreateBlogInput, UpdateBlogInput } from "./blog.validation";
import { BLOG_JOBS } from "../../queues/blog.queue";
import mongoose from "mongoose";
import redisClient from "../../config/redis.config";

// Types
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

// Service
export const blogService = {
  // Sanitize
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

  // Pagination envelope
  buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  },

  // Create
  async createBlog(blogData: CreateBlogInput, id: string) {
    const slug = await generateUniqueSlug(blogData.heading);

    const newBlog = await blogRepository.create({
      ...blogData,
      slug,
      createdBy: new mongoose.Types.ObjectId(id),
    });

    await Promise.all([
      redisClient.del("allBlog:*"),
      redisClient.del("allPopularBlog:*"),
    ]);

    return this.sanitizeBlog(newBlog);
  },

  // Read (lists)
  async getAllBlogs(page: number, limit: number) {
    const cacheKey = `allBlog:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      blogRepository.findAll(skip, limit),
      blogRepository.totalCount(),
    ]);
    const result = this.buildPaginatedResponse(
      data.map((b) => this.sanitizeBlog(b)!),
      total,
      page,
      limit,
    );
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  async getAllByPopularity(page: number, limit: number) {
    const cacheKey = `allPopularBlog:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      blogRepository.findAllByPopularity(skip, limit),
      blogRepository.totalCount(),
    ]);
    const result = this.buildPaginatedResponse(
      data.map((b) => this.sanitizeBlog(b)!),
      total,
      page,
      limit,
    );
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  async getAllByCategory(category: string, page: number, limit: number) {
    const cacheKey = `allBlogByCategory:${category}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      blogRepository.findByCategory(category, skip, limit),
      blogRepository.countByCategory(category),
    ]);
    const result = this.buildPaginatedResponse(
      data.map((b) => this.sanitizeBlog(b)!),
      total,
      page,
      limit,
    );
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  async getAllByTag(tag: string, page: number, limit: number) {
    const cacheKey = `allBlogByTag:${tag}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      blogRepository.findByTag(tag, skip, limit),
      blogRepository.countByTag(tag),
    ]);
    const result = this.buildPaginatedResponse(
      data.map((b) => this.sanitizeBlog(b)!),
      total,
      page,
      limit,
    );
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  async getAllByAuthor(userId: string, page: number, limit: number) {
    const cacheKey = `allBlogByAuthor:${userId}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    checkId(userId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      blogRepository.findByAuthor(userId, skip, limit),
      blogRepository.countByAuthor(userId),
    ]);
    const result = this.buildPaginatedResponse(
      data.map((b) => this.sanitizeBlog(b)!),
      total,
      page,
      limit,
    );
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  async searchBlogs(query: string, page: number, limit: number) {
    if (!query || query.trim().length < 2)
      throw new AppError("Search query must be at least 2 characters", 400);
    const skip = (page - 1) * limit;
    const trimmedQuery = query.trim();
    const cacheKey = `search:${trimmedQuery}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("Search cache hit");
      return JSON.parse(cached);
    }
    const [data, total] = await Promise.all([
      blogRepository.search(trimmedQuery, skip, limit),
      blogRepository.countSearch(trimmedQuery),
    ]);
    const result = this.buildPaginatedResponse(
      data.map((b) => this.sanitizeBlog(b)!),
      total,
      page,
      limit,
    );
    await redisClient.set(cacheKey, JSON.stringify(result), "EX", 30 );
    return result;
  },

  // Read (single)
  async getById(blogId: string) {
    checkId(blogId);
    const cacheKey = `blog:${blogId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);
    const result = this.sanitizeBlog(blog);
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  async getBySlug(slug: string) {
    const slugTrimmed = slug.trim();
    if (!slug || slugTrimmed.length === 0)
      throw new AppError("Slug is required", 400);
    const cacheKey = `slug:${slugTrimmed}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const blog = await blogRepository.findBySlug(slugTrimmed);
    if (!blog) throw new AppError("Blog not found", 404);
    const result = this.sanitizeBlog(blog);
    await redisClient.set(cacheKey, JSON.stringify(result), "EX",60);
    return result;
  },

  // Update
  async updateBlog(
    blogId: string,
    updateData: UpdateBlogInput,
    requesterId: string,
    requesterRole: "user" | "admin",
  ) {
    checkId(blogId);
    checkId(requesterId);

    const existing = await blogRepository.findById(blogId);
    if (!existing) throw new AppError("Blog not found", 404);

    const isOwner = existing.createdBy.toString() === requesterId;
    if (!isOwner && requesterRole !== "admin")
      throw new AppError("Forbidden: you do not own this blog", 403);

    let slug = existing.slug;
    if (updateData.heading && updateData.heading !== existing.heading) {
      await redisClient.del(`slug:${slug.trim()}`);
      slug = await generateUniqueSlug(updateData.heading, {
        excludedId: blogId,
      });
    }

    const updated = await blogRepository.update(blogId, {
      ...updateData,
      slug,
      updatedBy: new mongoose.Types.ObjectId(requesterId),
    });

    if (!updated) throw new AppError("Blog update failed", 500);
    await Promise.all([
      redisClient.del("allBlog:*"),
      redisClient.del("allPopularBlog:*"),
      redisClient.del(`blog:${blogId}`),
      redisClient.del("allBlogByCategory:*"),
      redisClient.del("allBlogByTag:*"),
      redisClient.del("search:*"),
    ]);

    const newScore = calculatePopularity(updated);
    await blogRepository.updatePopularityScore(blogId, newScore);

    return this.sanitizeBlog(updated);
  },

  // Delete
  async deleteBlog(
    blogId: string,
    requesterId: string,
    requesterRole: "User" | "Admin",
  ) {
    checkId(blogId);
    checkId(requesterId);

    const existing = await blogRepository.findById(blogId);
    if (!existing) throw new AppError("Blog not found", 404);

    const isOwner = existing.createdBy.toString() === requesterId;
    if (!isOwner && requesterRole !== "Admin")
      throw new AppError("Forbidden: you do not own this blog", 403);

    const deleted = await blogRepository.softDelete(
      blogId,
      requesterId,
      requesterRole,
    );
    if (!deleted) throw new AppError("Blog deletion failed", 500);
    await Promise.all([
      redisClient.del("allBlog:*"),
      redisClient.del("allPopularBlog:*"),
      redisClient.del(`blog:${blogId}`),
      redisClient.del("allBlogByCategory:*"),
      redisClient.del("allBlogByTag:*"),
      redisClient.del("search:*"),
    ]);

    return { id: blogId, deleted: true };
  },

  // Interactions
  async trackView(blogId: string, ip: string, userId?: string) {
    checkId(blogId);

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);

    let viewer = userId || ip;

    const key = `view${blogId}:${viewer}`;

    const exist = await redisClient.get(key);

    if (!exist) {
      await blogRepository.incrementView(blogId);
      await blogQueue.add(BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);

      await redisClient.set(key, "1", "EX", 600);
    }
    return { counted: !exist };
  },

  async likeBlog(blogId: string, userId: string) {
    checkId(blogId);
    checkId(userId);

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);

    const result = await blogRepository.incrementLike(blogId, userId);
    if (result.modifiedCount === 0)
      throw new AppError("You have already liked this blog", 409);

    await blogQueue.add(BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
    return { liked: true };
  },

  async unlikeBlog(blogId: string, userId: string) {
    checkId(blogId);
    checkId(userId);

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new AppError("Blog not found", 404);

    const result = await blogRepository.decrementLikes(blogId, userId);
    if (result.modifiedCount === 0)
      throw new AppError("You have not liked this blog", 409);

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

  // Comment helpers
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

  // Popularity (called by queue worker)
  async recalculatePopularity(blogId: string) {
    checkId(blogId);
    const blog = await blogRepository.findById(blogId);
    if (!blog) return;
    const score = calculatePopularity(blog);
    await blogRepository.updatePopularityScore(blogId, score);
  },
};