import { z } from "zod";
import { commentService } from "../../../modules/Comment/comment.service";
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

const createCommentSchema = z.object({
  blogId: mongoId.describe("MongoDB ObjectId of the blog post being commented on"),
  userId: mongoId.describe("MongoDB ObjectId of the user posting the comment"),
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
  userId: mongoId.describe("MongoDB ObjectId of the comment owner making the update"),
  content: z
    .string()
    .trim()
    .min(1)
    .max(250)
    .describe("New comment content (max 250 characters)"),
});

const deleteCommentSchema = z.object({
  commentId: mongoId.describe("MongoDB ObjectId of the comment to delete"),
  userId: mongoId.describe("MongoDB ObjectId of the owner requesting deletion"),
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
    "Creates a new comment on a blog post. " +
    "If 'parentCommentId' is supplied the comment is treated as a reply and the " +
    "parent's reply counter is incremented. " +
    "Root comments are automatically attached to the blog.",
  inputSchema: createCommentSchema,
  handler: async (input: z.infer<typeof createCommentSchema>) => {
    try {
      const result = await commentService.createComment(
        input.blogId,
        input.userId,
        input.content,
        input.parentCommentId,
      );
      return formatToolSuccess(result, 201);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getCommentsTool = {
  name: "get-comments",
  description:
    "Returns root-level (top-level) comments for a given blog post, " +
    "sorted by creation time newest-first. " +
    "Use the returned 'nextCursor' to fetch subsequent pages.",
  inputSchema: getCommentsSchema,
  handler: async (input: z.infer<typeof getCommentsSchema>) => {
    try {
      const result = await commentService.getComments(input.blogId, input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const getRepliesToolDef = {
  name: "get-replies",
  description:
    "Returns replies (child comments) nested under a specific parent comment. " +
    "Paginated with the same cursor strategy as get-comments.",
  inputSchema: getRepliesSchema,
  handler: async (input: z.infer<typeof getRepliesSchema>) => {
    try {
      const result = await commentService.getReplies(input.commentId, input.cursor, input.limit);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const updateCommentTool = {
  name: "update-comment",
  description:
    "Updates the text content of a comment. " +
    "Only the original author (userId) may update their own comment. " +
    "Throws 403 if the userId does not match the comment owner.",
  inputSchema: updateCommentSchema,
  handler: async (input: z.infer<typeof updateCommentSchema>) => {
    try {
      const result = await commentService.updateComment(
        input.commentId,
        input.userId,
        input.content,
      );
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const deleteCommentTool = {
  name: "delete-comment",
  description:
    "Soft-deletes a comment (marks it deleted, does NOT erase from the database). " +
    "Root comments are detached from the parent blog. " +
    "Reply comments decrement the parent's reply count. " +
    "Only the comment owner may call this.",
  inputSchema: deleteCommentSchema,
  handler: async (input: z.infer<typeof deleteCommentSchema>) => {
    try {
      const result = await commentService.deleteComment(input.commentId, input.userId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const likeCommentTool = {
  name: "like-comment",
  description:
    "Increments the like counter on a comment by 1. " +
    "No de-duplication at the service layer – the caller is responsible for " +
    "ensuring a user doesn't double-like (auth layer concern).",
  inputSchema: likeCommentSchema,
  handler: async (input: z.infer<typeof likeCommentSchema>) => {
    try {
      const result = await commentService.likeComment(input.commentId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const unlikeCommentTool = {
  name: "unlike-comment",
  description:
    "Decrements the like counter on a comment by 1.",
  inputSchema: unlikeCommentSchema,
  handler: async (input: z.infer<typeof unlikeCommentSchema>) => {
    try {
      const result = await commentService.unlikeComment(input.commentId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
};

export const reportCommentTool = {
  name: "report-comment",
  description:
    "Increments the report counter on a comment for moderation. " +
    "High report counts can trigger manual review.",
  inputSchema: reportCommentSchema,
  handler: async (input: z.infer<typeof reportCommentSchema>) => {
    try {
      const result = await commentService.reportComment(input.commentId);
      return formatToolSuccess(result);
    } catch (err) {
      return formatToolError(err);
    }
  },
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
