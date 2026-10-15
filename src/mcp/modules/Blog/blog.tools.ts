import { z } from "zod";
import { blogService } from "../../../modules/Blog/blog.service";
import { formatToolSuccess } from "../../utils/mcp.helpers";
import { guardToolHandler } from "../../security/mcp.security.guard";
import { mcpConfig } from "../../../config/mcp/mcp.config";

// ─── Shared sub-schemas ───────────────────────────────────────────────────────
const mongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid 24-character MongoDB ObjectId");

const cursorPagination = z.object({
  cursor: z.string().optional().describe("Opaque pagination cursor from a previous response"),
  limit: z.number().int().min(1).max(100).default(10).describe("Number of items per page (1–100)"),
});

// ─── Input schema types ───────────────────────────────────────────────────────

const getBlogsByCategorySchema = cursorPagination.extend({
  category: z.string().min(1).describe("Category name to filter by (e.g. 'Technology')"),
});

const getBlogsByTagSchema = cursorPagination.extend({
  tag: z.string().min(1).describe("Tag string to filter by (e.g. 'nodejs')"),
});

const getBlogsByAuthorSchema = cursorPagination.extend({
  userId: mongoId.describe("MongoDB ObjectId of the author"),
});

const searchBlogsSchema = z.object({
  query: z.string().min(2).describe("Search term (minimum 2 characters)"),
  cursor: z.string().optional().describe("Pagination cursor from a previous search response"),
  page: z.number().int().min(1).optional().describe("Fallback page number when no cursor is provided"),
  limit: z.number().int().min(1).max(100).default(10).describe("Results per page"),
});

const getBlogByIdSchema = z.object({
  blogId: mongoId.describe("The MongoDB ObjectId of the blog post"),
});

const getBlogBySlugSchema = z.object({
  slug: z.string().min(1).describe("URL-friendly slug of the blog post"),
});

const createBlogSchema = z.object({
  heading: z.string().min(3).max(150).describe("Blog title / heading"),
  content: z.string().min(10).describe("Full blog body content (HTML or Markdown)"),
  userId: mongoId
    .optional()
    .describe("MongoDB ObjectId of the author (optional: automatically bound to authenticated user token)"),
  tags: z.array(z.string().trim()).optional().describe("Optional list of tag strings"),
  category: z.array(z.string().trim()).optional().describe("Optional list of category strings"),
  status: z.enum(["draft", "published", "archived"]).optional().describe("Publication status"),
});

const updateBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to update"),
  requesterId: mongoId
    .optional()
    .describe("MongoDB ObjectId of the user making the request (optional: automatically bound from token)"),
  requesterRole: z
    .enum(["user", "admin"])
    .optional()
    .describe("Role of the requester (optional: automatically verified from token)"),
  heading: z.string().min(3).max(150).optional().describe("New heading"),
  content: z.string().min(10).optional().describe("New content"),
  tags: z.array(z.string().trim()).optional().describe("Replacement tag list"),
  category: z.array(z.string().trim()).optional().describe("Replacement category list"),
  status: z.enum(["draft", "published", "archived"]).optional().describe("New status"),
});

const deleteBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to delete"),
  requesterId: mongoId
    .optional()
    .describe("MongoDB ObjectId of the requester (optional: automatically bound from token)"),
  requesterRole: z
    .enum(["user", "admin"])
    .optional()
    .describe("Role of the requester (optional: automatically verified from token)"),
});

const likeBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to like"),
  userId: mongoId
    .optional()
    .describe("MongoDB ObjectId of user liking (optional: automatically bound from token)"),
});

const unlikeBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to unlike"),
  userId: mongoId
    .optional()
    .describe("MongoDB ObjectId of user unliking (optional: automatically bound from token)"),
});

const reportBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to report"),
});

const trackViewSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the viewed blog"),
  ip: z.string().min(1).describe("IP address of the viewer"),
  userId: mongoId.optional().describe("MongoDB ObjectId of the authenticated viewer (if any)"),
});

// ─── Blog Tool Definitions ────────────────────────────────────────────────────

export const getAllBlogsTool = {
  name: "get-all-blogs",
  description:
    "Returns a cursor-paginated list of all published blogs, sorted by newest first. " +
    "Use 'cursor' from the previous response to fetch the next page. " +
    "Great for browsing the full blog catalogue.",
  inputSchema: cursorPagination,
  handler: guardToolHandler(
    async (input: z.infer<typeof cursorPagination>) => {
      const result = await blogService.getAllBlogs(input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-all-blogs" },
  ),
};

export const getBlogsByPopularityTool = {
  name: "get-blogs-by-popularity",
  description:
    "Returns published blogs ordered by their calculated popularity score " +
    "(a weighted mix of views, likes and comment count). " +
    "Ideal for 'trending' or 'top posts' features.",
  inputSchema: cursorPagination,
  handler: guardToolHandler(
    async (input: z.infer<typeof cursorPagination>) => {
      const result = await blogService.getAllByPopularity(input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-blogs-by-popularity" },
  ),
};

export const getBlogsByCategoryTool = {
  name: "get-blogs-by-category",
  description:
    "Fetches published blogs assigned to a specific category (case-insensitive substring match). " +
    "Returns cursor pagination metadata.",
  inputSchema: getBlogsByCategorySchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getBlogsByCategorySchema>) => {
      const result = await blogService.getAllByCategory(input.category, input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-blogs-by-category" },
  ),
};

export const getBlogsByTagTool = {
  name: "get-blogs-by-tag",
  description:
    "Fetches published blogs matching a given tag (case-insensitive). " +
    "Returns cursor pagination metadata.",
  inputSchema: getBlogsByTagSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getBlogsByTagSchema>) => {
      const result = await blogService.getAllByTag(input.tag, input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-blogs-by-tag" },
  ),
};

export const getBlogsByAuthorTool = {
  name: "get-blogs-by-author",
  description:
    "Returns published blogs written by a specific author (identified by author's userId). " +
    "Supports cursor pagination.",
  inputSchema: getBlogsByAuthorSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getBlogsByAuthorSchema>) => {
      const result = await blogService.getAllByAuthor(input.userId, input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-blogs-by-author" },
  ),
};

export const searchBlogsTool = {
  name: "search-blogs",
  description:
    "Performs text search across published blog headings and contents. " +
    "Returns matched blogs with highlights and pagination metadata.",
  inputSchema: searchBlogsSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof searchBlogsSchema>) => {
      const result = await blogService.searchBlogs(
        input.query,
        { cursor: input.cursor, page: input.page },
        input.limit,
      );
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "search-blogs" },
  ),
};

export const getBlogByIdTool = {
  name: "get-blog-by-id",
  description:
    "Fetches the full details of a single blog post using its MongoDB ObjectId. " +
    "Returns the complete document including views, likeCount, commentCount, and timestamps.",
  inputSchema: getBlogByIdSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getBlogByIdSchema>) => {
      const result = await blogService.getById(input.blogId);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-blog-by-id" },
  ),
};

export const getBlogBySlugTool = {
  name: "get-blog-by-slug",
  description:
    "Fetches a single published blog post by its URL-friendly slug string " +
    "(e.g. 'my-first-post-xyz123'). Useful when the AI knows the slug from a URL.",
  inputSchema: getBlogBySlugSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getBlogBySlugSchema>) => {
      const result = await blogService.getBySlug(input.slug);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-blog-by-slug" },
  ),
};

export const createBlogTool = {
  name: "create-blog",
  description:
    "[Protected] Creates a new blog post. Requires user authentication. " +
    "The author identity is automatically verified and bound from the access token. " +
    "A unique URL slug is auto-generated from the heading. Status defaults to 'draft'.",
  inputSchema: createBlogSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof createBlogSchema>, _extra, context) => {
      const { userId, ...blogData } = input;
      const authorId = context?.user.id ?? userId!;
      const result = await blogService.createBlog(blogData, authorId);
      return formatToolSuccess(result, 201);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "create-blog" },
  ),
};

export const updateBlogTool = {
  name: "update-blog",
  description:
    "[Protected] Updates an existing blog post. Requires authentication. " +
    "The requester must be the blog owner or an admin. Identity is verified via access token.",
  inputSchema: updateBlogSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof updateBlogSchema>, _extra, context) => {
      const { blogId, requesterId, requesterRole, ...updateData } = input;
      const actualRequesterId = context?.user.id ?? requesterId!;
      const actualRequesterRole = context?.user.role ?? requesterRole!;
      const result = await blogService.updateBlog(
        blogId,
        updateData,
        actualRequesterId,
        actualRequesterRole,
      );
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "update-blog" },
  ),
};

export const deleteBlogTool = {
  name: "delete-blog",
  description:
    "[Protected] Soft-deletes a blog post. Requires authentication. " +
    "Only the blog owner or an admin can perform this action. Identity is verified via access token.",
  inputSchema: deleteBlogSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof deleteBlogSchema>, _extra, context) => {
      const actualRequesterId = context?.user.id ?? input.requesterId!;
      const actualRequesterRole = context?.user.role ?? input.requesterRole!;
      const result = await blogService.deleteBlog(
        input.blogId,
        actualRequesterId,
        actualRequesterRole,
      );
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "delete-blog" },
  ),
};

export const likeBlogTool = {
  name: "like-blog",
  description:
    "[Protected] Adds a like from the authenticated user to a blog post. Requires authentication. " +
    "Idempotent-safe: returns 409 if already liked.",
  inputSchema: likeBlogSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof likeBlogSchema>, _extra, context) => {
      const userId = context?.user.id ?? input.userId!;
      const result = await blogService.likeBlog(input.blogId, userId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "like-blog" },
  ),
};

export const unlikeBlogTool = {
  name: "unlike-blog",
  description:
    "[Protected] Removes a like from the authenticated user on a blog post. Requires authentication.",
  inputSchema: unlikeBlogSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof unlikeBlogSchema>, _extra, context) => {
      const userId = context?.user.id ?? input.userId!;
      const result = await blogService.unlikeBlog(input.blogId, userId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "unlike-blog" },
  ),
};

export const reportBlogTool = {
  name: "report-blog",
  description:
    "[Protected] Increments the report/flag counter on a blog post. Requires authentication.",
  inputSchema: reportBlogSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof reportBlogSchema>) => {
      const result = await blogService.reportBlog(input.blogId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "report-blog" },
  ),
};

export const trackViewTool = {
  name: "track-view",
  description:
    "Records a unique page view for a blog post (rate-limited by IP/user via Redis). " +
    "Increments views counter if within cooldown.",
  inputSchema: trackViewSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof trackViewSchema>, _extra, context) => {
      const viewerId = context?.user.id ?? input.userId;
      const result = await blogService.trackView(input.blogId, input.ip, viewerId);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "track-view" },
  ),
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const blogTools = [
  getAllBlogsTool,
  getBlogsByPopularityTool,
  getBlogsByCategoryTool,
  getBlogsByTagTool,
  getBlogsByAuthorTool,
  searchBlogsTool,
  getBlogByIdTool,
  getBlogBySlugTool,
  createBlogTool,
  updateBlogTool,
  deleteBlogTool,
  likeBlogTool,
  unlikeBlogTool,
  reportBlogTool,
  trackViewTool,
] as const;
