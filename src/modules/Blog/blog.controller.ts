import { blogService } from "./blog.service";
import { Response, Request, NextFunction } from "express";
import { createBlogSchema, updateBlogSchema } from "./blog.validation";
import AppError from "../../utils/AppError";
import { str } from "../../utils/toString";

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function parsePagination(query: Request["query"]): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(str(query.page) || "1", 10) || 1);
  const limit = Math.min(100, parseInt(str(query.limit) || "10", 10) || 10);
  return { page, limit };
}

// ─────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────

export const blogController = {
  // ── Create ────────────────────────────────────────

  async createBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const id: string = (req as any).user?.id;
      const result = createBlogSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Validation failed",
            errors: result.error.flatten(),
          });
      }
      const blog = await blogService.createBlog(result.data, id);
      return res
        .status(201)
        .json({
          success: true,
          message: "Blog created successfully",
          data: blog,
        });
    } catch (error) {
      next(error);
    }
  },

  // ── Read (lists) ──────────────────────────────────

  async getAllBlogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await blogService.getAllBlogs(page, limit);
      return res
        .status(200)
        .json({
          success: true,
          message: "Blogs fetched successfully",
          ...result,
        });
    } catch (error) {
      next(error);
    }
  },

  async getAllByPopularity(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await blogService.getAllByPopularity(page, limit);
      return res
        .status(200)
        .json({
          success: true,
          message: "Trending blogs fetched successfully",
          ...result,
        });
    } catch (error) {
      next(error);
    }
  },

  async getAllByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = str(req.params.category).trim();
      if (!category) throw new AppError("Category is required", 400);

      const { page, limit } = parsePagination(req.query);
      const result = await blogService.getAllByCategory(category, page, limit);
      return res
        .status(200)
        .json({
          success: true,
          message: `Blogs for category '${category}' fetched successfully`,
          ...result,
        });
    } catch (error) {
      next(error);
    }
  },

  async getAllByTag(req: Request, res: Response, next: NextFunction) {
    try {
      const tag = str(req.params.tag).trim();
      if (!tag) throw new AppError("Tag is required", 400);

      const { page, limit } = parsePagination(req.query);
      const result = await blogService.getAllByTag(tag, page, limit);
      return res
        .status(200)
        .json({
          success: true,
          message: `Blogs for tag '${tag}' fetched successfully`,
          ...result,
        });
    } catch (error) {
      next(error);
    }
  },

  async getAllByAuthor(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await blogService.getAllByAuthor(
        str(req.params.userId),
        page,
        limit,
      );
      return res
        .status(200)
        .json({
          success: true,
          message: "Author blogs fetched successfully",
          ...result,
        });
    } catch (error) {
      next(error);
    }
  },

  async searchBlogs(req: Request, res: Response, next: NextFunction) {
    try {
      const query = str(req.query.q).trim();
      if (query.length < 2) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Search query must be at least 2 characters",
          });
      }
      const { page, limit } = parsePagination(req.query);
      const result = await blogService.searchBlogs(query, page, limit);
      return res
        .status(200)
        .json({
          success: true,
          message: "Search results fetched successfully",
          query,
          ...result,
        });
    } catch (error) {
      next(error);
    }
  },

  // ── Read (single) ─────────────────────────────────

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const blog = await blogService.getById(str(req.params.id));
      return res
        .status(200)
        .json({
          success: true,
          message: "Blog fetched successfully",
          data: blog,
        });
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const blog = await blogService.getBySlug(str(req.params.slug));
      return res
        .status(200)
        .json({
          success: true,
          message: "Blog fetched successfully",
          data: blog,
        });
    } catch (error) {
      next(error);
    }
  },

  // ── Update ────────────────────────────────────────

  async updateBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateBlogSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Validation failed",
            errors: result.error.flatten(),
          });
      }

      const requesterId: string = (req as any).user?.id;
      const requesterRole: "User" | "Admin" = (req as any).user?.role ?? "User";
      if (!requesterId) throw new AppError("Authentication required", 401);

      const updated = await blogService.updateBlog(
        str(req.params.id),
        result.data,
        requesterId,
        requesterRole,
      );
      return res
        .status(200)
        .json({
          success: true,
          message: "Blog updated successfully",
          data: updated,
        });
    } catch (error) {
      next(error);
    }
  },

  // ── Delete ────────────────────────────────────────

  async deleteBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterId: string = (req as any).user?.id;
      const requesterRole: "User" | "Admin" = (req as any).user?.role ?? "User";
      if (!requesterId) throw new AppError("Authentication required", 401);

      const result = await blogService.deleteBlog(
        str(req.params.id),
        requesterId,
        requesterRole,
      );
      return res
        .status(200)
        .json({
          success: true,
          message: "Blog deleted successfully",
          data: result,
        });
    } catch (error) {
      next(error);
    }
  },

  // ── Interactions ──────────────────────────────────

  async trackView(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip;
      const userId = req.user?.id;
      const result = blogService.trackView(str(req.params.id), str(ip), userId);
      return res
        .status(200)
        .json({ success: true, message: "View tracked", data: result });
    } catch (error) {
      next(error);
    }
  },

  async likeBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId: string = (req as any).user?.id;
      if (!userId) throw new AppError("Authentication required", 401);

      const result = await blogService.likeBlog(str(req.params.id), userId);
      return res
        .status(200)
        .json({
          success: true,
          message: "Blog liked successfully",
          data: result,
        });
    } catch (error) {
      next(error);
    }
  },

  async unlikeBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId: string = (req as any).user?.id;
      if (!userId) throw new AppError("Authentication required", 401);

      const result = await blogService.unlikeBlog(str(req.params.id), userId);
      return res
        .status(200)
        .json({
          success: true,
          message: "Blog unliked successfully",
          data: result,
        });
    } catch (error) {
      next(error);
    }
  },

  async reportBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await blogService.reportBlog(str(req.params.id));
      return res
        .status(200)
        .json({ success: true, message: "Blog reported", data: result });
    } catch (error) {
      next(error);
    }
  },
};
