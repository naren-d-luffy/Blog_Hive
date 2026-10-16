"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogTools = exports.trackViewTool = exports.reportBlogTool = exports.unlikeBlogTool = exports.likeBlogTool = exports.deleteBlogTool = exports.updateBlogTool = exports.createBlogTool = exports.getBlogBySlugTool = exports.getBlogByIdTool = exports.searchBlogsTool = exports.getBlogsByAuthorTool = exports.getBlogsByTagTool = exports.getBlogsByCategoryTool = exports.getBlogsByPopularityTool = exports.getAllBlogsTool = void 0;
const zod_1 = require("zod");
const blog_service_1 = require("../../../modules/Blog/blog.service");
const mcp_helpers_1 = require("../../utils/mcp.helpers");
const mcp_security_guard_1 = require("../../security/mcp.security.guard");
const mcp_config_1 = require("../../../config/mcp/mcp.config");
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
    userId: mongoId
        .optional()
        .describe("MongoDB ObjectId of the author (optional: automatically bound to authenticated user token)"),
    tags: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Optional list of tag strings"),
    category: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Optional list of category strings"),
    status: zod_1.z.enum(["draft", "published", "archived"]).optional().describe("Publication status"),
});
const updateBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to update"),
    requesterId: mongoId
        .optional()
        .describe("MongoDB ObjectId of the user making the request (optional: automatically bound from token)"),
    requesterRole: zod_1.z
        .enum(["user", "admin"])
        .optional()
        .describe("Role of the requester (optional: automatically verified from token)"),
    heading: zod_1.z.string().min(3).max(150).optional().describe("New heading"),
    content: zod_1.z.string().min(10).optional().describe("New content"),
    tags: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Replacement tag list"),
    category: zod_1.z.array(zod_1.z.string().trim()).optional().describe("Replacement category list"),
    status: zod_1.z.enum(["draft", "published", "archived"]).optional().describe("New status"),
});
const deleteBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to delete"),
    requesterId: mongoId
        .optional()
        .describe("MongoDB ObjectId of the requester (optional: automatically bound from token)"),
    requesterRole: zod_1.z
        .enum(["user", "admin"])
        .optional()
        .describe("Role of the requester (optional: automatically verified from token)"),
});
const likeBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to like"),
    userId: mongoId
        .optional()
        .describe("MongoDB ObjectId of user liking (optional: automatically bound from token)"),
});
const unlikeBlogSchema = zod_1.z.object({
    blogId: mongoId.describe("MongoDB ObjectId of the blog to unlike"),
    userId: mongoId
        .optional()
        .describe("MongoDB ObjectId of user unliking (optional: automatically bound from token)"),
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
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getAllBlogs(input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-all-blogs" }),
};
exports.getBlogsByPopularityTool = {
    name: "get-blogs-by-popularity",
    description: "Returns published blogs ordered by their calculated popularity score " +
        "(a weighted mix of views, likes and comment count). " +
        "Ideal for 'trending' or 'top posts' features.",
    inputSchema: cursorPagination,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getAllByPopularity(input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-blogs-by-popularity" }),
};
exports.getBlogsByCategoryTool = {
    name: "get-blogs-by-category",
    description: "Fetches published blogs assigned to a specific category (case-insensitive substring match). " +
        "Returns cursor pagination metadata.",
    inputSchema: getBlogsByCategorySchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getAllByCategory(input.category, input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-blogs-by-category" }),
};
exports.getBlogsByTagTool = {
    name: "get-blogs-by-tag",
    description: "Fetches published blogs matching a given tag (case-insensitive). " +
        "Returns cursor pagination metadata.",
    inputSchema: getBlogsByTagSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getAllByTag(input.tag, input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-blogs-by-tag" }),
};
exports.getBlogsByAuthorTool = {
    name: "get-blogs-by-author",
    description: "Returns published blogs written by a specific author (identified by author's userId). " +
        "Supports cursor pagination.",
    inputSchema: getBlogsByAuthorSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getAllByAuthor(input.userId, input.cursor, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-blogs-by-author" }),
};
exports.searchBlogsTool = {
    name: "search-blogs",
    description: "Performs text search across published blog headings and contents. " +
        "Returns matched blogs with highlights and pagination metadata.",
    inputSchema: searchBlogsSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.searchBlogs(input.query, { cursor: input.cursor, page: input.page }, input.limit);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "search-blogs" }),
};
exports.getBlogByIdTool = {
    name: "get-blog-by-id",
    description: "Fetches the full details of a single blog post using its MongoDB ObjectId. " +
        "Returns the complete document including views, likeCount, commentCount, and timestamps.",
    inputSchema: getBlogByIdSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getById(input.blogId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-blog-by-id" }),
};
exports.getBlogBySlugTool = {
    name: "get-blog-by-slug",
    description: "Fetches a single published blog post by its URL-friendly slug string " +
        "(e.g. 'my-first-post-xyz123'). Useful when the AI knows the slug from a URL.",
    inputSchema: getBlogBySlugSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.getBySlug(input.slug);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "get-blog-by-slug" }),
};
exports.createBlogTool = {
    name: "create-blog",
    description: "[Protected] Creates a new blog post. Requires user authentication. " +
        "The author identity is automatically verified and bound from the access token. " +
        "A unique URL slug is auto-generated from the heading. Status defaults to 'draft'.",
    inputSchema: createBlogSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const { userId, ...blogData } = input;
        const authorId = context?.user.id ?? userId;
        const result = await blog_service_1.blogService.createBlog(blogData, authorId);
        return (0, mcp_helpers_1.formatToolSuccess)(result, 201);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "create-blog" }),
};
exports.updateBlogTool = {
    name: "update-blog",
    description: "[Protected] Updates an existing blog post. Requires authentication. " +
        "The requester must be the blog owner or an admin. Identity is verified via access token.",
    inputSchema: updateBlogSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const { blogId, requesterId, requesterRole, ...updateData } = input;
        const actualRequesterId = context?.user.id ?? requesterId;
        const actualRequesterRole = context?.user.role ?? requesterRole;
        const result = await blog_service_1.blogService.updateBlog(blogId, updateData, actualRequesterId, actualRequesterRole);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "update-blog" }),
};
exports.deleteBlogTool = {
    name: "delete-blog",
    description: "[Protected] Soft-deletes a blog post. Requires authentication. " +
        "Only the blog owner or an admin can perform this action. Identity is verified via access token.",
    inputSchema: deleteBlogSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const actualRequesterId = context?.user.id ?? input.requesterId;
        const actualRequesterRole = context?.user.role ?? input.requesterRole;
        const result = await blog_service_1.blogService.deleteBlog(input.blogId, actualRequesterId, actualRequesterRole);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "delete-blog" }),
};
exports.likeBlogTool = {
    name: "like-blog",
    description: "[Protected] Adds a like from the authenticated user to a blog post. Requires authentication. " +
        "Idempotent-safe: returns 409 if already liked.",
    inputSchema: likeBlogSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const userId = context?.user.id ?? input.userId;
        const result = await blog_service_1.blogService.likeBlog(input.blogId, userId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "like-blog" }),
};
exports.unlikeBlogTool = {
    name: "unlike-blog",
    description: "[Protected] Removes a like from the authenticated user on a blog post. Requires authentication.",
    inputSchema: unlikeBlogSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const userId = context?.user.id ?? input.userId;
        const result = await blog_service_1.blogService.unlikeBlog(input.blogId, userId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "unlike-blog" }),
};
exports.reportBlogTool = {
    name: "report-blog",
    description: "[Protected] Increments the report/flag counter on a blog post. Requires authentication.",
    inputSchema: reportBlogSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input) => {
        const result = await blog_service_1.blogService.reportBlog(input.blogId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "report-blog" }),
};
exports.trackViewTool = {
    name: "track-view",
    description: "Records a unique page view for a blog post (rate-limited by IP/user via Redis). " +
        "Increments views counter if within cooldown.",
    inputSchema: trackViewSchema,
    handler: (0, mcp_security_guard_1.guardToolHandler)(async (input, _extra, context) => {
        const viewerId = context?.user.id ?? input.userId;
        const result = await blog_service_1.blogService.trackView(input.blogId, input.ip, viewerId);
        return (0, mcp_helpers_1.formatToolSuccess)(result);
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "track-view" }),
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
