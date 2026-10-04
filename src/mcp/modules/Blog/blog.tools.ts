import { z } from "zod";
import { blogService } from "../../../modules/Blog/blog.service";
import { formatToolError, formatToolSuccess } from "../../utils/mcp.helpers";

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
  userId: mongoId.describe("MongoDB ObjectId of the author creating the blog"),
  tags: z.array(z.string().trim()).optional().describe("Optional list of tag strings"),
  category: z.array(z.string().trim()).optional().describe("Optional list of category strings"),
  status: z.enum(["draft", "published", "archived"]).optional().describe("Publication status"),
});

const updateBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to update"),
  requesterId: mongoId.describe("MongoDB ObjectId of the user making the request"),
  requesterRole: z.enum(["user", "admin"]).describe("Role of the requester"),
  heading: z.string().min(3).max(150).optional().describe("New heading"),
  content: z.string().min(10).optional().describe("New content"),
  tags: z.array(z.string().trim()).optional().describe("Replacement tag list"),
  category: z.array(z.string().trim()).optional().describe("Replacement category list"),
  status: z.enum(["draft", "published", "archived"]).optional().describe("New status"),
});

const deleteBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to delete"),
  requesterId: mongoId.describe("MongoDB ObjectId of the requester"),
  requesterRole: z.enum(["user", "admin"]).describe("Role of the requester"),
});

const likeBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to like"),
  userId: mongoId.describe("MongoDB ObjectId of the user who is liking"),
});

const unlikeBlogSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog to unlike"),
  userId: mongoId.describe("MongoDB ObjectId of the user who is unliking"),
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
  handler: async (input: z.infer<typeof cursorPagination>) => {
    try {
      const result = await blogService.getAllBlogs(input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getBlogsByPopularityTool = {
  name: "get-blogs-by-popularity",
  description:
    "Returns published blogs ordered by their calculated popularity score " +
    "(a weighted mix of views, likes and comment count). " +
    "Ideal for 'trending' or 'top posts' features.",
  inputSchema: cursorPagination,
  handler: async (input: z.infer<typeof cursorPagination>) => {
    try {
      const result = await blogService.getAllByPopularity(input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getBlogsByCategoryTool = {
  name: "get-blogs-by-category",
  description:
    "Returns published blogs that belong to a specific category. " +
    "Paginated with cursor support.",
  inputSchema: getBlogsByCategorySchema,
  handler: async (input: z.infer<typeof getBlogsByCategorySchema>) => {
    try {
      const result = await blogService.getAllByCategory(input.category, input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getBlogsByTagTool = {
  name: "get-blogs-by-tag",
  description:
    "Returns published blogs that carry a specific tag. " +
    "Tags are free-form strings set by authors at creation time.",
  inputSchema: getBlogsByTagSchema,
  handler: async (input: z.infer<typeof getBlogsByTagSchema>) => {
    try {
      const result = await blogService.getAllByTag(input.tag, input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getBlogsByAuthorTool = {
  name: "get-blogs-by-author",
  description:
    "Returns blogs (all statuses) written by a specific author. " +
    "Requires the author's MongoDB ObjectId.",
  inputSchema: getBlogsByAuthorSchema,
  handler: async (input: z.infer<typeof getBlogsByAuthorSchema>) => {
    try {
      const result = await blogService.getAllByAuthor(input.userId, input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const searchBlogsTool = {
  name: "search-blogs",
  description:
    "Full-text search across blog headings and content. " +
    "Requires at least 2 characters. " +
    "Supports cursor-based pagination for iterating large result sets.",
  inputSchema: searchBlogsSchema,
  handler: async (input: z.infer<typeof searchBlogsSchema>) => {
    try {
      const result = await blogService.searchBlogs(
        input.query,
        { cursor: input.cursor, page: input.page },
        input.limit,
      );
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getBlogByIdTool = {
  name: "get-blog-by-id",
  description:
    "Fetches a single blog post by its MongoDB ObjectId. " +
    "Returns full sanitized blog details. Throws 404 if not found or soft-deleted.",
  inputSchema: getBlogByIdSchema,
  handler: async (input: z.infer<typeof getBlogByIdSchema>) => {
    try {
      const result = await blogService.getById(input.blogId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getBlogBySlugTool = {
  name: "get-blog-by-slug",
  description:
    "Fetches a single published blog post by its URL-friendly slug string " +
    "(e.g. 'my-first-post-xyz123'). Useful when the AI knows the slug from a URL.",
  inputSchema: getBlogBySlugSchema,
  handler: async (input: z.infer<typeof getBlogBySlugSchema>) => {
    try {
      const result = await blogService.getBySlug(input.slug);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const createBlogTool = {
  name: "create-blog",
  description:
    "Creates a new blog post. The caller must supply a valid author userId. " +
    "A unique URL slug is auto-generated from the heading. " +
    "Status defaults to 'draft' if not supplied.",
  inputSchema: createBlogSchema,
  handler: async (input: z.infer<typeof createBlogSchema>) => {
    try {
      const { userId, ...blogData } = input;
      const result = await blogService.createBlog(blogData, userId);
      return formatToolSuccess(result, 201);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const updateBlogTool = {
  name: "update-blog",
  description:
    "Updates an existing blog post. The requester must be the blog owner or an admin. " +
    "All fields are optional – only supplied fields are patched. " +
    "Changing the heading regenerates the slug automatically.",
  inputSchema: updateBlogSchema,
  handler: async (input: z.infer<typeof updateBlogSchema>) => {
    try {
      const { blogId, requesterId, requesterRole, ...updateData } = input;
      const result = await blogService.updateBlog(blogId, updateData, requesterId, requesterRole);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const deleteBlogTool = {
  name: "delete-blog",
  description:
    "Soft-deletes a blog post. The post is marked deleted but NOT permanently removed. " +
    "Only the blog owner or an admin can perform this action.",
  inputSchema: deleteBlogSchema,
  handler: async (input: z.infer<typeof deleteBlogSchema>) => {
    try {
      const result = await blogService.deleteBlog(
        input.blogId,
        input.requesterId,
        input.requesterRole,
      );
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const likeBlogTool = {
  name: "like-blog",
  description:
    "Adds a like from a specific user to a blog post. " +
    "Idempotent-safe: throws 409 if the user has already liked the post.",
  inputSchema: likeBlogSchema,
  handler: async (input: z.infer<typeof likeBlogSchema>) => {
    try {
      const result = await blogService.likeBlog(input.blogId, input.userId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const unlikeBlogTool = {
  name: "unlike-blog",
  description:
    "Removes a previously placed like from a blog post. " +
    "Throws 409 if the user had not liked the post.",
  inputSchema: unlikeBlogSchema,
  handler: async (input: z.infer<typeof unlikeBlogSchema>) => {
    try {
      const result = await blogService.unlikeBlog(input.blogId, input.userId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const reportBlogTool = {
  name: "report-blog",
  description:
    "Increments the report counter on a blog post. " +
    "Used to flag content for moderation review.",
  inputSchema: reportBlogSchema,
  handler: async (input: z.infer<typeof reportBlogSchema>) => {
    try {
      const result = await blogService.reportBlog(input.blogId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const trackViewTool = {
  name: "track-view",
  description:
    "Tracks a view on a blog post. Each unique viewer (by userId or IP) is counted " +
    "at most once per 10 minutes (enforced via Redis TTL). " +
    "Triggers an async popularity score recalculation in the background.",
  inputSchema: trackViewSchema,
  handler: async (input: z.infer<typeof trackViewSchema>) => {
    try {
      const result = await blogService.trackView(input.blogId, input.ip, input.userId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
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
