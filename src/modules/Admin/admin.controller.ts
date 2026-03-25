import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { adminLoginSchema, createAdminSchema } from "./admin.validator";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";

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
      next(error)
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
      next(error)
    }
  },

  async getAdminById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.user?.id;

      if(!id){
        return next(new AppError("Id is required",400))
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
      next(error)
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
      next(error)
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
      next(error)
    }
  },
};
