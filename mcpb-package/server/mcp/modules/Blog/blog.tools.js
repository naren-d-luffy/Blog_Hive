"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogTools = exports.trackViewTool = exports.reportBlogTool = exports.unlikeBlogTool = exports.likeBlogTool = exports.deleteBlogTool = exports.updateBlogTool = exports.createBlogTool = exports.getBlogBySlugTool = exports.getBlogByIdTool = exports.searchBlogsTool = exports.getBlogsByAuthorTool = exports.getBlogsByTagTool = exports.getBlogsByCategoryTool = exports.getBlogsByPopularityTool = exports.getAllBlogsTool = void 0;
const zod_1 = require("zod");
const blog_service_1 = require("../../../modules/Blog/blog.service");
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
const getBlogsByCategorySchema = cursorPagination.extend({
    category: zod_1.z.string().min(1).describe("Category name to filter by (e.g. 'Technology')"),
});
const getBlogsByTagSchema = cursorPagination.extend({
    tag: zod_1.z.string().min(1).describe("Tag string to filter by (e.g. 'nodejs')"),
});
const getBlogsByAuthorSchema = cursorPagination.extend({
    userId: mongoId.describe("MongoDB ObjectId of the author"),
});
const searchBlogsSchema = zod_1.z.object({
    query: zod_1.z.string().min(2).describe("Search term (minimum 2 characters)"),
    cursor: zod_1.z.string().optional().describe("Pagination cursor from a previous search response"),
    page: zod_1.z.number().int().min(1).optional().describe("Fallback page number when no cursor is provided"),
    limit: zod_1.z.number().int().min(1).max(100).default(10).describe("Results per page"),
});
const getBlogByIdSchema = zod_1.z.object({
    blogId: mongoId.describe("The MongoDB ObjectId of the blog post"),
});
const getBlogBySlugSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).describe("URL-friendly slug of the blog post"),
});
const createBlogSchema = zod_1.z.object({
    heading: zod_1.z.string().min(3).max(150).describe("Blog title / heading"),
    content: zod_1.z.string().min(10).describe("Full blog body content (HTML or Markdown)"),
    userId: mongoId.describe("MongoDB ObjectId of the author creating the blog"),
    tags: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Optional list of tag strings"),
    category: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Optional list of category strings"),
    status: zod_1.z.enum(["draft", "published", "archived"]).optional().describe("Publication status"),
});
const updateBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to update"),
    requesterId: mongoId.describe("MongoDB ObjectId of the user making the request"),
    requesterRole: zod_1.z.enum(["user", "admin"]).describe("Role of the requester"),
    heading: zod_1.z.string().min(3).max(150).optional().describe("New heading"),
    content: zod_1.z.string().min(10).optional().describe("New content"),
    tags: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Replacement tag list"),
    category: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Replacement category list"),
    status: zod_1.z.enum(["draft", "published", "archived"]).optional().describe("New status"),
});
const deleteBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to delete"),
    requesterId: mongoId.describe("MongoDB ObjectId of the requester"),
    requesterRole: zod_1.z.enum(["user", "admin"]).describe("Role of the requester"),
});
const likeBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to like"),
    userId: mongoId.describe("MongoDB ObjectId of the user who is liking"),
});
const unlikeBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to unlike"),
    userId: mongoId.describe("MongoDB ObjectId of the user who is unliking"),
});
const reportBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to report"),
});
const trackViewSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the viewed blog"),
    ip: zod_1.z.string().min(1).describe("IP address of the viewer"),
    userId: mongoId.optional().describe("MongoDB ObjectId of the authenticated viewer (if any)"),
});
// ─── Blog Tool Definitions ────────────────────────────────────────────────────
exports.getAllBlogsTool = {
    name: "get-all-blogs",
    description: "Returns a cursor-paginated list of all published blogs, sorted by newest first. " +
        "Use 'cursor' from the previous response to fetch the next page. " +
        "Great for browsing the full blog catalogue.",
    inputSchema: cursorPagination,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getAllBlogs(input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getBlogsByPopularityTool = {
    name: "get-blogs-by-popularity",
    description: "Returns published blogs ordered by their calculated popularity score " +
        "(a weighted mix of views, likes and comment count). " +
        "Ideal for 'trending' or 'top posts' features.",
    inputSchema: cursorPagination,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getAllByPopularity(input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getBlogsByCategoryTool = {
    name: "get-blogs-by-category",
    description: "Returns published blogs that belong to a specific category. " +
        "Paginated with cursor support.",
    inputSchema: getBlogsByCategorySchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getAllByCategory(input.category, input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getBlogsByTagTool = {
    name: "get-blogs-by-tag",
    description: "Returns published blogs that carry a specific tag. " +
        "Tags are free-form strings set by authors at creation time.",
    inputSchema: getBlogsByTagSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getAllByTag(input.tag, input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getBlogsByAuthorTool = {
    name: "get-blogs-by-author",
    description: "Returns blogs (all statuses) written by a specific author. " +
        "Requires the author's MongoDB ObjectId.",
    inputSchema: getBlogsByAuthorSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getAllByAuthor(input.userId, input.cursor, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.searchBlogsTool = {
    name: "search-blogs",
    description: "Full-text search across blog headings and content. " +
        "Requires at least 2 characters. " +
        "Supports cursor-based pagination for iterating large result sets.",
    inputSchema: searchBlogsSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.searchBlogs(input.query, { cursor: input.cursor, page: input.page }, input.limit);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getBlogByIdTool = {
    name: "get-blog-by-id",
    description: "Fetches a single blog post by its MongoDB ObjectId. " +
        "Returns full sanitized blog details. Throws 404 if not found or soft-deleted.",
    inputSchema: getBlogByIdSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getById(input.blogId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.getBlogBySlugTool = {
    name: "get-blog-by-slug",
    description: "Fetches a single published blog post by its URL-friendly slug string " +
        "(e.g. 'my-first-post-xyz123'). Useful when the AI knows the slug from a URL.",
    inputSchema: getBlogBySlugSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.getBySlug(input.slug);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.createBlogTool = {
    name: "create-blog",
    description: "Creates a new blog post. The caller must supply a valid author userId. " +
        "A unique URL slug is auto-generated from the heading. " +
        "Status defaults to 'draft' if not supplied.",
    inputSchema: createBlogSchema,
    handler: async (input) => {
        try {
            const { userId, ...blogData } = input;
            const result = await blog_service_1.blogService.createBlog(blogData, userId);
            return (0, mcp_helpers_1.formatToolSuccess)(result, 201);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.updateBlogTool = {
    name: "update-blog",
    description: "Updates an existing blog post. The requester must be the blog owner or an admin. " +
        "All fields are optional – only supplied fields are patched. " +
        "Changing the heading regenerates the slug automatically.",
    inputSchema: updateBlogSchema,
    handler: async (input) => {
        try {
            const { blogId, requesterId, requesterRole, ...updateData } = input;
            const result = await blog_service_1.blogService.updateBlog(blogId, updateData, requesterId, requesterRole);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.deleteBlogTool = {
    name: "delete-blog",
    description: "Soft-deletes a blog post. The post is marked deleted but NOT permanently removed. " +
        "Only the blog owner or an admin can perform this action.",
    inputSchema: deleteBlogSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.deleteBlog(input.blogId, input.requesterId, input.requesterRole);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.likeBlogTool = {
    name: "like-blog",
    description: "Adds a like from a specific user to a blog post. " +
        "Idempotent-safe: throws 409 if the user has already liked the post.",
    inputSchema: likeBlogSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.likeBlog(input.blogId, input.userId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.unlikeBlogTool = {
    name: "unlike-blog",
    description: "Removes a previously placed like from a blog post. " +
        "Throws 409 if the user had not liked the post.",
    inputSchema: unlikeBlogSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.unlikeBlog(input.blogId, input.userId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.reportBlogTool = {
    name: "report-blog",
    description: "Increments the report counter on a blog post. " +
        "Used to flag content for moderation review.",
    inputSchema: reportBlogSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.reportBlog(input.blogId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
exports.trackViewTool = {
    name: "track-view",
    description: "Tracks a view on a blog post. Each unique viewer (by userId or IP) is counted " +
        "at most once per 10 minutes (enforced via Redis TTL). " +
        "Triggers an async popularity score recalculation in the background.",
    inputSchema: trackViewSchema,
    handler: async (input) => {
        try {
            const result = await blog_service_1.blogService.trackView(input.blogId, input.ip, input.userId);
            return (0, mcp_helpers_1.formatToolSuccess)(result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatToolError)(err);
        }
    },
};
// ─── Registry ─────────────────────────────────────────────────────────────────
exports.blogTools = [
    exports.getAllBlogsTool,
    exports.getBlogsByPopularityTool,
    exports.getBlogsByCategoryTool,
    exports.getBlogsByTagTool,
    exports.getBlogsByAuthorTool,
    exports.searchBlogsTool,
    exports.getBlogByIdTool,
    exports.getBlogBySlugTool,
    exports.createBlogTool,
    exports.updateBlogTool,
    exports.deleteBlogTool,
    exports.likeBlogTool,
    exports.unlikeBlogTool,
    exports.reportBlogTool,
    exports.trackViewTool,
];
