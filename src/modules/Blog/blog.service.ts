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
import { redisClient } from "../../config/redis.config";
import { decodeCursor, encodeCursor } from "../../utils/Cursor/cursor";
import type { CursorPaginationResult } from "../../types/cursor.types";

const QUEUE_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
};

const deleteCacheByPatterns = async (patterns: string[]) => {
  for (const pattern of patterns) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
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

  // Create
  async createBlog(blogData: CreateBlogInput, id: string) {
    const slug = await generateUniqueSlug(blogData.heading);

    const newBlog = await blogRepository.create({
      ...blogData,
      slug,
      createdBy: new mongoose.Types.ObjectId(id),
    });

    await deleteCacheByPatterns([
      "allBlog:*",
      "allPopularBlog:*",
      "allBlogByCategory:*",
      "allBlogByTag:*",
      "allBlogByAuthor:*",
      "search:*",
    ]);

    return this.sanitizeBlog(newBlog);
  },

  // Read (lists)
  async getAllBlogs(cursor: string | undefined, limit: number) {
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `allBlog:cursor:${cursor ?? "initial"}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rawData = await blogRepository.findAll(decodedCursor, limit + 1);
    const hasNextPage = rawData.length > limit;
    const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
    const sanitizedData = blogs.map((b) => this.sanitizeBlog(b)!);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const lastBlog = blogs.at(-1)!;
      nextCursor = encodeCursor({
        createdAt: lastBlog.createdAt.toISOString(),
        id: lastBlog._id.toString(),
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

  async getAllByPopularity(cursor: string | undefined, limit: number) {
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `allPopularBlog:cursor:${cursor ?? "initial"}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rawData = await blogRepository.findAllByPopularity(decodedCursor, limit + 1);
    const hasNextPage = rawData.length > limit;
    const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
    const sanitizedData = blogs.map((b) => this.sanitizeBlog(b)!);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const lastBlog = blogs.at(-1)!;
      nextCursor = encodeCursor({
        createdAt: lastBlog.createdAt.toISOString(),
        id: lastBlog._id.toString(),
        popularityScore: lastBlog.popularityScore ?? 0,
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

  async getAllByCategory(category: string, cursor: string | undefined, limit: number) {
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `allBlogByCategory:${category}:cursor:${cursor ?? "initial"}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rawData = await blogRepository.findByCategory(category, decodedCursor, limit + 1);
    const hasNextPage = rawData.length > limit;
    const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
    const sanitizedData = blogs.map((b) => this.sanitizeBlog(b)!);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const lastBlog = blogs.at(-1)!;
      nextCursor = encodeCursor({
        createdAt: lastBlog.createdAt.toISOString(),
        id: lastBlog._id.toString(),
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

  async getAllByTag(tag: string, cursor: string | undefined, limit: number) {
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `allBlogByTag:${tag}:cursor:${cursor ?? "initial"}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rawData = await blogRepository.findByTag(tag, decodedCursor, limit + 1);
    const hasNextPage = rawData.length > limit;
    const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
    const sanitizedData = blogs.map((b) => this.sanitizeBlog(b)!);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const lastBlog = blogs.at(-1)!;
      nextCursor = encodeCursor({
        createdAt: lastBlog.createdAt.toISOString(),
        id: lastBlog._id.toString(),
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

  async getAllByAuthor(userId: string, cursor: string | undefined, limit: number) {
    checkId(userId);
    const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
    const cacheKey = `allBlogByAuthor:${userId}:cursor:${cursor ?? "initial"}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rawData = await blogRepository.findByAuthor(userId, decodedCursor, limit + 1);
    const hasNextPage = rawData.length > limit;
    const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
    const sanitizedData = blogs.map((b) => this.sanitizeBlog(b)!);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const lastBlog = blogs.at(-1)!;
      nextCursor = encodeCursor({
        createdAt: lastBlog.createdAt.toISOString(),
        id: lastBlog._id.toString(),
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

  async searchBlogs(
    query: string,
    options: { cursor?: string; page?: number },
    limit: number,
  ) {
    if (!query || query.trim().length < 2)
      throw new AppError("Search query must be at least 2 characters", 400);

    const trimmedQuery = query.trim();
    let skip = 0;

    if (options.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (typeof parsed.skip === "number" && parsed.skip >= 0) {
          skip = parsed.skip;
        } else {
          throw new AppError("Invalid Cursor", 400);
        }
      } catch {
        throw new AppError("Invalid Cursor", 400);
      }
    } else if (options.page && options.page > 0) {
      skip = (options.page - 1) * limit;
    }

    const cacheKey = `search:${trimmedQuery}:cursor:${options.cursor ?? `skip_${skip}`}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const rawData = await blogRepository.search(trimmedQuery, skip, limit + 1);
    const hasNextPage = rawData.length > limit;
    const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
    const sanitizedData = blogs.map((b) => this.sanitizeBlog(b)!);

    let nextCursor: string | null = null;
    if (hasNextPage) {
      nextCursor = Buffer.from(JSON.stringify({ skip: skip + limit })).toString("base64");
    }

    const result = {
      sanitizedData,
      limit,
      hasNextPage,
      nextCursor,
    };
    await redisClient.set(cacheKey, JSON.stringify(result), "EX", 30);
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
    await Promise.all([redisClient.del(`blog:${blogId}`), redisClient.del(`slug:${slug.trim()}`)]);
    await deleteCacheByPatterns([
      "allBlog:*",
      "allPopularBlog:*",
      "allBlogByCategory:*",
      "allBlogByTag:*",
      "allBlogByAuthor:*",
      "search:*",
    ]);

    const newScore = calculatePopularity(updated);
    await blogRepository.updatePopularityScore(blogId, newScore);

    return this.sanitizeBlog(updated);
  },

  // Delete
  async deleteBlog(
    blogId: string,
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

    const actorModel = requesterRole === "admin" ? "Admin" : "User";

    const deleted = await blogRepository.softDelete(
      blogId,
      requesterId,
      actorModel,
    );
    if (!deleted) throw new AppError("Blog deletion failed", 500);
    await Promise.all([redisClient.del(`blog:${blogId}`), redisClient.del(`slug:${existing.slug.trim()}`)]);
    await deleteCacheByPatterns([
      "allBlog:*",
      "allPopularBlog:*",
      "allBlogByCategory:*",
      "allBlogByTag:*",
      "allBlogByAuthor:*",
      "search:*",
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