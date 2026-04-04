import { z } from "zod";

// Mongo ObjectId validator
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

// Create BLOG
export const createBlogSchema = z.object({
  heading: z.string().min(3, "Heading must be at least 3 characters").max(150, "Heading too long").trim(),
  content: z.string().min(10, "Content must be at least 10 characters"),
  createdBy: objectId,
  tags: z.array(z.string().trim()).optional(),
  category: z.array(z.string().trim()).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

// Update BLOG
export const updateBlogSchema = z.object({
  heading: z.string().min(3).max(150).trim().optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.string().trim()).optional(),
  category: z.array(z.string().trim()).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  updatedBy: objectId.optional(),
});

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;