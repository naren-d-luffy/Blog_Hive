import { z } from "zod";

// Create Comment
export const createCommentSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(250, "Comment cannot exceed 250 characters"),

    parentCommentId: z.string().optional(),
  }),

  params: z.object({
    blogId: z.string(),
  }),
});

// Update Comment
export const updateCommentSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(250, "Comment cannot exceed 250 characters"),
  }),

  params: z.object({
    commentId: z.string(),
  }),
});

// Pagination (for get)
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});