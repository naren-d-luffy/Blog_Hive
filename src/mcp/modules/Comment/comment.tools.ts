import { z } from "zod";
import { commentService } from "../../../modules/Comment/comment.service";
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

const createCommentSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog post being commented on"),
  userId: mongoId
    .optional()
    .describe("MongoDB ObjectId of user posting (optional: automatically bound from access token)"),
  content: z
    .string()
    .trim()
    .min(1)
    .max(250)
    .describe("Comment text (max 250 characters)"),
  parentCommentId: mongoId
    .optional()
    .describe(
      "MongoDB ObjectId of the parent comment. Omit for root comments; supply for replies.",
    ),
});

const getCommentsSchema = cursorPagination.extend({
  blogId: mongoId.describe("MongoDB ObjectId of the blog post"),
});

const getRepliesSchema = cursorPagination.extend({
  commentId: mongoId.describe("MongoDB ObjectId of the parent comment"),
});

const updateCommentSchema = z.object({
  commentId: mongoId.describe("MongoDB ObjectId of the comment to update"),
  userId: mongoId
    .optional()
    .describe("MongoDB ObjectId of comment owner (optional: automatically bound from token)"),
  content: z
    .string()
    .trim()
    .min(1)
    .max(250)
    .describe("New comment content (max 250 characters)"),
});

const deleteCommentSchema = z.object({
  commentId: mongoId.describe("MongoDB ObjectId of the comment to delete"),
  userId: mongoId
    .optional()
    .describe("MongoDB ObjectId of owner (optional: automatically bound from token)"),
});

const likeCommentSchema = z.object({
  commentId: mongoId.describe("MongoDB ObjectId of the comment to like"),
});

const unlikeCommentSchema = z.object({
  commentId: mongoId.describe("MongoDB ObjectId of the comment to unlike"),
});

const reportCommentSchema = z.object({
  commentId: mongoId.describe("MongoDB ObjectId of the comment to report"),
});

// ─── Comment Tool Definitions ─────────────────────────────────────────────────

export const createCommentTool = {
  name: "create-comment",
  description:
    "[Protected] Creates a new comment on a blog post. Requires user authentication. " +
    "The commenter's identity is automatically verified from the access token. " +
    "Supply 'parentCommentId' to post a reply.",
  inputSchema: createCommentSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof createCommentSchema>, _extra, context) => {
      const authorId = context?.user.id ?? input.userId!;
      const result = await commentService.createComment(
        input.blogId,
        authorId,
        input.content,
        input.parentCommentId,
      );
      return formatToolSuccess(result, 201);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "create-comment" },
  ),
};

export const getCommentsTool = {
  name: "get-comments",
  description:
    "Returns root-level (top-level) comments for a given blog post, " +
    "sorted by creation time newest-first. " +
    "Use the returned 'nextCursor' to fetch subsequent pages.",
  inputSchema: getCommentsSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getCommentsSchema>) => {
      const result = await commentService.getComments(input.blogId, input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-comments" },
  ),
};

export const getRepliesToolDef = {
  name: "get-replies",
  description:
    "Returns replies (child comments) nested under a specific parent comment. " +
    "Paginated with the same cursor strategy as get-comments.",
  inputSchema: getRepliesSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof getRepliesSchema>) => {
      const result = await commentService.getReplies(input.commentId, input.cursor, input.limit);
      return formatToolSuccess(result);
    },
    { requireAuth: mcpConfig.security.strictMode, actionName: "get-replies" },
  ),
};

export const updateCommentTool = {
  name: "update-comment",
  description:
    "[Protected] Updates the text content of a comment. Requires user authentication. " +
    "Only the original author may update their own comment.",
  inputSchema: updateCommentSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof updateCommentSchema>, _extra, context) => {
      const authorId = context?.user.id ?? input.userId!;
      const result = await commentService.updateComment(
        input.commentId,
        authorId,
        input.content,
      );
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "update-comment" },
  ),
};

export const deleteCommentTool = {
  name: "delete-comment",
  description:
    "[Protected] Soft-deletes a comment. Requires user authentication. " +
    "Only the comment owner (or an admin) may delete a comment.",
  inputSchema: deleteCommentSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof deleteCommentSchema>, _extra, context) => {
      const authorId = context?.user.id ?? input.userId!;
      const result = await commentService.deleteComment(input.commentId, authorId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "delete-comment" },
  ),
};

export const likeCommentTool = {
  name: "like-comment",
  description:
    "[Protected] Increments the like counter on a comment by 1. Requires authentication.",
  inputSchema: likeCommentSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof likeCommentSchema>) => {
      const result = await commentService.likeComment(input.commentId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "like-comment" },
  ),
};

export const unlikeCommentTool = {
  name: "unlike-comment",
  description:
    "[Protected] Decrements the like counter on a comment by 1. Requires authentication.",
  inputSchema: unlikeCommentSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof unlikeCommentSchema>) => {
      const result = await commentService.unlikeComment(input.commentId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "unlike-comment" },
  ),
};

export const reportCommentTool = {
  name: "report-comment",
  description:
    "[Protected] Increments the report counter on a comment for moderation. Requires authentication.",
  inputSchema: reportCommentSchema,
  handler: guardToolHandler(
    async (input: z.infer<typeof reportCommentSchema>) => {
      const result = await commentService.reportComment(input.commentId);
      return formatToolSuccess(result);
    },
    { requireAuth: true, roles: ["user", "admin"], actionName: "report-comment" },
  ),
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const commentTools = [
  createCommentTool,
  getCommentsTool,
  getRepliesToolDef,
  updateCommentTool,
  deleteCommentTool,
  likeCommentTool,
  unlikeCommentTool,
  reportCommentTool,
] as const;
