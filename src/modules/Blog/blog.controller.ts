import { blogService } from "./blog.service";
import { Response, Request, NextFunction } from "express";
import { createBlogSchema, updateBlogSchema } from "./blog.validation";
import AppError from "../../utils/AppError";
import { str } from "../../utils/toString";
import asyncHandler from "../../utils/asyncHandler";

// Helpers
function parsePagination(query: Request["query"]): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(str(query.page) || "1", 10) || 1);
  const limit = Math.min(100, parseInt(str(query.limit) || "10", 10) || 10);
  return { page, limit };
}

// Controller
export const blogController = {
  createBlog: asyncHandler(async (req: Request, res: Response) => {
    const id: string = (req as any).user?.id;
    const result = createBlogSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }
    const blog = await blogService.createBlog(result.data, id);
    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  }),

  getAllBlogs: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await blogService.getAllBlogs(page, limit);
    return res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      ...result,
    });
  }),

  getAllByPopularity: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await blogService.getAllByPopularity(page, limit);
    return res.status(200).json({
      success: true,
      message: "Trending blogs fetched successfully",
      ...result,
    });
  }),

  getAllByCategory: asyncHandler(async (req: Request, res: Response) => {
    const category = str(req.params.category).trim();
    if (!category) throw new AppError("Category is required", 400);

    const { page, limit } = parsePagination(req.query);
    const result = await blogService.getAllByCategory(category, page, limit);
    return res.status(200).json({
      success: true,
      message: `Blogs for category '${category}' fetched successfully`,
      ...result,
    });
  }),

  getAllByTag: asyncHandler(async (req: Request, res: Response) => {
    const tag = str(req.params.tag).trim();
    if (!tag) throw new AppError("Tag is required", 400);

    const { page, limit } = parsePagination(req.query);
    const result = await blogService.getAllByTag(tag, page, limit);
    return res.status(200).json({
      success: true,
      message: `Blogs for tag '${tag}' fetched successfully`,
      ...result,
    });
  }),

  getAllByAuthor: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await blogService.getAllByAuthor(
      str(req.params.userId),
      page,
      limit,
    );
    return res.status(200).json({
      success: true,
      message: "Author blogs fetched successfully",
      ...result,
    });
  }),

  searchBlogs: asyncHandler(async (req: Request, res: Response) => {
    const query = str(req.query.q).trim();
    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }
    const { page, limit } = parsePagination(req.query);
    const result = await blogService.searchBlogs(query, page, limit);
    return res.status(200).json({
      success: true,
      message: "Search results fetched successfully",
      query,
      ...result,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.getById(str(req.params.id));
    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      data: blog,
    });
  }),

  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const blog = await blogService.getBySlug(str(req.params.slug));
    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      data: blog,
    });
  }),

  updateBlog: asyncHandler(async (req: Request, res: Response) => {
    const result = updateBlogSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) throw new AppError("Authentication required", 401);
    if (!requesterRole) throw new AppError("Role is required", 403);

    const updated = await blogService.updateBlog(
      str(req.params.id),
      result.data,
      requesterId,
      requesterRole,
    );
    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updated,
    });
  }),

  deleteBlog: asyncHandler(async (req: Request, res: Response) => {
    const requesterId: string = (req as any).user?.id;
    const requesterRole: "User" | "Admin" = (req as any).user?.role ?? "User";
    if (!requesterId) throw new AppError("Authentication required", 401);

    const result = await blogService.deleteBlog(
      str(req.params.id),
      requesterId,
      requesterRole,
    );
    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: result,
    });
  }),

  trackView: asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip;
    const userId = req.user?.id;
    const result = blogService.trackView(str(req.params.id), str(ip), userId);
    return res
      .status(200)
      .json({ success: true, message: "View tracked", data: result });
  }),

  likeBlog: asyncHandler(async (req: Request, res: Response) => {
    const userId: string = (req as any).user?.id;
    if (!userId) throw new AppError("Authentication required", 401);

    const result = await blogService.likeBlog(str(req.params.id), userId);
    return res.status(200).json({
      success: true,
      message: "Blog liked successfully",
      data: result,
    });
  }),

  unlikeBlog: asyncHandler(async (req: Request, res: Response) => {
    const userId: string = (req as any).user?.id;
    if (!userId) throw new AppError("Authentication required", 401);

    const result = await blogService.unlikeBlog(str(req.params.id), userId);
    return res.status(200).json({
      success: true,
      message: "Blog unliked successfully",
      data: result,
    });
  }),

  reportBlog: asyncHandler(async (req: Request, res: Response) => {
    const result = await blogService.reportBlog(str(req.params.id));
    return res
      .status(200)
      .json({ success: true, message: "Blog reported", data: result });
  }),
};
