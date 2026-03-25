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
        message: "Admin Fetched Successfully",
        data: admin,
      });
    } catch (error) {
      return next(new AppError("Error Creating Admin",400,{error}));
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
      return next(new AppError("Error login Admin",400,{error}));
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.user?.id;

      if(!id){
        return next(new AppError("Unauthorized", 401))
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
      return next(new AppError("Error logging out Admin",400,{error}));
    }
  },
};
