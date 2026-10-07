"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogService = void 0;
const blog_repository_1 = require("./blog.repository");
const queue_config_1 = require("../../config/queue.config");
const AppError_1 = __importDefault(require("../../utils/AppError"));
const CheckId_1 = __importDefault(require("../../utils/CheckId"));
const slug_1 = require("../../utils/slug");
const calculatePopularity_1 = require("../../utils/calculatePopularity");
const blog_queue_1 = require("../../queues/blog.queue");
const mongoose_1 = __importDefault(require("mongoose"));
const redis_config_1 = require("../../config/redis.config");
const cursor_1 = require("../../utils/Cursor/cursor");
const QUEUE_OPTS = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
};
const deleteCacheByPatterns = async (patterns) => {
    for (const pattern of patterns) {
        const keys = await redis_config_1.redisClient.keys(pattern);
        if (keys.length > 0) {
            await redis_config_1.redisClient.del(...keys);
        }
    }
};
// Service
exports.blogService = {
    // Sanitize
    sanitizeBlog(blog) {
        if (!blog)
            return null;
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
    async createBlog(blogData, id) {
        const slug = await (0, slug_1.generateUniqueSlug)(blogData.heading);
        const newBlog = await blog_repository_1.blogRepository.create({
            ...blogData,
            slug,
            createdBy: new mongoose_1.default.Types.ObjectId(id),
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
    async getAllBlogs(cursor, limit) {
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `allBlog:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const rawData = await blog_repository_1.blogRepository.findAll(decodedCursor, limit + 1);
        const hasNextPage = rawData.length > limit;
        const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
        const sanitizedData = blogs.map((b) => this.sanitizeBlog(b));
        let nextCursor = null;
        if (hasNextPage) {
            const lastBlog = blogs.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
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
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async getAllByPopularity(cursor, limit) {
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `allPopularBlog:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const rawData = await blog_repository_1.blogRepository.findAllByPopularity(decodedCursor, limit + 1);
        const hasNextPage = rawData.length > limit;
        const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
        const sanitizedData = blogs.map((b) => this.sanitizeBlog(b));
        let nextCursor = null;
        if (hasNextPage) {
            const lastBlog = blogs.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
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
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async getAllByCategory(category, cursor, limit) {
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `allBlogByCategory:${category}:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const rawData = await blog_repository_1.blogRepository.findByCategory(category, decodedCursor, limit + 1);
        const hasNextPage = rawData.length > limit;
        const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
        const sanitizedData = blogs.map((b) => this.sanitizeBlog(b));
        let nextCursor = null;
        if (hasNextPage) {
            const lastBlog = blogs.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
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
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async getAllByTag(tag, cursor, limit) {
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `allBlogByTag:${tag}:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const rawData = await blog_repository_1.blogRepository.findByTag(tag, decodedCursor, limit + 1);
        const hasNextPage = rawData.length > limit;
        const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
        const sanitizedData = blogs.map((b) => this.sanitizeBlog(b));
        let nextCursor = null;
        if (hasNextPage) {
            const lastBlog = blogs.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
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
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async getAllByAuthor(userId, cursor, limit) {
        (0, CheckId_1.default)(userId);
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `allBlogByAuthor:${userId}:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const rawData = await blog_repository_1.blogRepository.findByAuthor(userId, decodedCursor, limit + 1);
        const hasNextPage = rawData.length > limit;
        const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
        const sanitizedData = blogs.map((b) => this.sanitizeBlog(b));
        let nextCursor = null;
        if (hasNextPage) {
            const lastBlog = blogs.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
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
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async searchBlogs(query, options, limit) {
        if (!query || query.trim().length < 2)
            throw new AppError_1.default("Search query must be at least 2 characters", 400);
        const trimmedQuery = query.trim();
        let skip = 0;
        if (options.cursor) {
            try {
                const decoded = Buffer.from(options.cursor, "base64").toString("utf-8");
                const parsed = JSON.parse(decoded);
                if (typeof parsed.skip === "number" && parsed.skip >= 0) {
                    skip = parsed.skip;
                }
                else {
                    throw new AppError_1.default("Invalid Cursor", 400);
                }
            }
            catch {
                throw new AppError_1.default("Invalid Cursor", 400);
            }
        }
        else if (options.page && options.page > 0) {
            skip = (options.page - 1) * limit;
        }
        const cacheKey = `search:${trimmedQuery}:cursor:${options.cursor ?? `skip_${skip}`}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const rawData = await blog_repository_1.blogRepository.search(trimmedQuery, skip, limit + 1);
        const hasNextPage = rawData.length > limit;
        const blogs = hasNextPage ? rawData.slice(0, limit) : rawData;
        const sanitizedData = blogs.map((b) => this.sanitizeBlog(b));
        let nextCursor = null;
        if (hasNextPage) {
            nextCursor = Buffer.from(JSON.stringify({ skip: skip + limit })).toString("base64");
        }
        const result = {
            sanitizedData,
            limit,
            hasNextPage,
            nextCursor,
        };
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 30);
        return result;
    },
    // Read (single)
    async getById(blogId) {
        (0, CheckId_1.default)(blogId);
        const cacheKey = `blog:${blogId}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const blog = await blog_repository_1.blogRepository.findById(blogId);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        const result = this.sanitizeBlog(blog);
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async getBySlug(slug) {
        const slugTrimmed = slug.trim();
        if (!slug || slugTrimmed.length === 0)
            throw new AppError_1.default("Slug is required", 400);
        const cacheKey = `slug:${slugTrimmed}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const blog = await blog_repository_1.blogRepository.findBySlug(slugTrimmed);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        const result = this.sanitizeBlog(blog);
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    // Update
    async updateBlog(blogId, updateData, requesterId, requesterRole) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(requesterId);
        const existing = await blog_repository_1.blogRepository.findById(blogId);
        if (!existing)
            throw new AppError_1.default("Blog not found", 404);
        const isOwner = existing.createdBy.toString() === requesterId;
        if (!isOwner && requesterRole !== "admin")
            throw new AppError_1.default("Forbidden: you do not own this blog", 403);
        let slug = existing.slug;
        if (updateData.heading && updateData.heading !== existing.heading) {
            await redis_config_1.redisClient.del(`slug:${slug.trim()}`);
            slug = await (0, slug_1.generateUniqueSlug)(updateData.heading, {
                excludedId: blogId,
            });
        }
        const updated = await blog_repository_1.blogRepository.update(blogId, {
            ...updateData,
            slug,
            updatedBy: new mongoose_1.default.Types.ObjectId(requesterId),
        });
        if (!updated)
            throw new AppError_1.default("Blog update failed", 500);
        await Promise.all([redis_config_1.redisClient.del(`blog:${blogId}`), redis_config_1.redisClient.del(`slug:${slug.trim()}`)]);
        await deleteCacheByPatterns([
            "allBlog:*",
            "allPopularBlog:*",
            "allBlogByCategory:*",
            "allBlogByTag:*",
            "allBlogByAuthor:*",
            "search:*",
        ]);
        const newScore = (0, calculatePopularity_1.calculatePopularity)(updated);
        await blog_repository_1.blogRepository.updatePopularityScore(blogId, newScore);
        return this.sanitizeBlog(updated);
    },
    // Delete
    async deleteBlog(blogId, requesterId, requesterRole) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(requesterId);
        const existing = await blog_repository_1.blogRepository.findById(blogId);
        if (!existing)
            throw new AppError_1.default("Blog not found", 404);
        const isOwner = existing.createdBy.toString() === requesterId;
        if (!isOwner && requesterRole !== "admin")
            throw new AppError_1.default("Forbidden: you do not own this blog", 403);
        const actorModel = requesterRole === "admin" ? "Admin" : "User";
        const deleted = await blog_repository_1.blogRepository.softDelete(blogId, requesterId, actorModel);
        if (!deleted)
            throw new AppError_1.default("Blog deletion failed", 500);
        await Promise.all([redis_config_1.redisClient.del(`blog:${blogId}`), redis_config_1.redisClient.del(`slug:${existing.slug.trim()}`)]);
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
    async trackView(blogId, ip, userId) {
        (0, CheckId_1.default)(blogId);
        const blog = await blog_repository_1.blogRepository.findById(blogId);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        let viewer = userId || ip;
        const key = `view${blogId}:${viewer}`;
        const exist = await redis_config_1.redisClient.get(key);
        if (!exist) {
            await blog_repository_1.blogRepository.incrementView(blogId);
            await queue_config_1.blogQueue.add(blog_queue_1.BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
            await redis_config_1.redisClient.set(key, "1", "EX", 600);
        }
        return { counted: !exist };
    },
    async likeBlog(blogId, userId) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(userId);
        const blog = await blog_repository_1.blogRepository.findById(blogId);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        const result = await blog_repository_1.blogRepository.incrementLike(blogId, userId);
        if (result.modifiedCount === 0)
            throw new AppError_1.default("You have already liked this blog", 409);
        await queue_config_1.blogQueue.add(blog_queue_1.BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
        return { liked: true };
    },
    async unlikeBlog(blogId, userId) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(userId);
        const blog = await blog_repository_1.blogRepository.findById(blogId);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        const result = await blog_repository_1.blogRepository.decrementLikes(blogId, userId);
        if (result.modifiedCount === 0)
            throw new AppError_1.default("You have not liked this blog", 409);
        await queue_config_1.blogQueue.add(blog_queue_1.BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
        return { unliked: true };
    },
    async reportBlog(blogId) {
        (0, CheckId_1.default)(blogId);
        const blog = await blog_repository_1.blogRepository.findById(blogId);
        if (!blog)
            throw new AppError_1.default("Blog not found", 404);
        await blog_repository_1.blogRepository.incrementReport(blogId);
        return { reported: true };
    },
    // Comment helpers
    async attachComment(blogId, commentId) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(commentId);
        await blog_repository_1.blogRepository.addComment(blogId, commentId);
        await queue_config_1.blogQueue.add(blog_queue_1.BLOG_JOBS.UPDATE_POPULARITY, { blogId }, QUEUE_OPTS);
    },
    async detachComment(blogId, commentId) {
        (0, CheckId_1.default)(blogId);
        (0, CheckId_1.default)(commentId);
        await blog_repository_1.blogRepository.removeComment(blogId, commentId);
    },
    // Popularity (called by queue worker)
    async recalculatePopularity(blogId) {
        (0, CheckId_1.default)(blogId);
        const blog = await blog_repository_1.blogRepository.findById(blogId);
        if (!blog)
            return;
        const score = (0, calculatePopularity_1.calculatePopularity)(blog);
        await blog_repository_1.blogRepository.updatePopularityScore(blogId, score);
    },
};
