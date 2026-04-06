import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { adminLoginSchema, createAdminSchema } from "./admin.validator";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { str } from "../../utils/toString";

interface params {
  id: string;
}

export const adminController = {
  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createAdminSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.message });
      }
      const admin = await adminService.createAdmin(result.data);

      res.status(201).json({
        success: true,
        message: "Admin Created Successfully",
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  },

  async getallAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await adminService.findAllAdmin(page, limit);

      res.status(200).json({
        success: true,
        message: "Admins fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAdminById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.user?.id;

      if (!id) {
        return next(new AppError("Id is required", 400));
      }

      const fetchedAdmin = await adminService.findAdminById(id);

      if (!fetchedAdmin) {
        return next(new AppError("Admin not Found or Deleted", 404));
      }
      res.status(200).json({
        success: true,
        message: "Admin fetched successfully",
        data: fetchedAdmin,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = adminLoginSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.message });
      }
      const { accessToken, refreshToken, safeData } =
        await adminService.loginAdmin(result.data);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(202).json({
        success: true,
        data: safeData,
        access: accessToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.user?.id;

      if (!id) {
        return next(new AppError("Unauthorized", 401));
      }

      await adminService.logoutAdmin(id);

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.status(200).json({
        success: true,
        message: "Logged out Successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request<params>, res: Response, next: NextFunction) {
    try {
      const id = str(req.params.id);
      const { status } = req.body;

      const updated = await adminService.updateStatus(id, status);
      res.status(200).json({
        success: true,
        message: "Admin status updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async softDelete(req: Request<params>, res: Response, next: NextFunction) {
    try {
      const id = str(req.params.id);

      const deleted = await adminService.softDelete(id);

      res.status(200).json({
        success: true,
        message: "Admin deleted successfully",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) res.status(401).json({ message: "Token is required" });

      const { accessToken, refreshToken, safeData } =
        await adminService.postRefresh(token);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res
        .status(200)
        .json({
          success: true,
          message: "Tokens Refreshed Successfully",
          accessToken: accessToken,
          admin: safeData,
        });
    } catch (error) {
      next(error);
    }
  },
};
