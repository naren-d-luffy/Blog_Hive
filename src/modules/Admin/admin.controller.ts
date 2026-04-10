import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { adminLoginSchema, changePasswordSchema, createAdminSchema } from "./admin.validator";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { str } from "../../utils/toString";
import { adminInviteService } from "../AdminInvite/adminInvite.service";

interface params {
  id: string;
}

export const adminController = {
  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) {
        return next(new AppError("Invite token is required", 400));
      }
      const isValid = await adminInviteService.getAdminInviteByToken(token);
      if (!isValid) {
        return next(new AppError("Invalid or expired invite token", 400));
      }

      const result = createAdminSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.message });
      }
      const admin = await adminService.createAdmin(result.data);

      await adminInviteService.markInviteAsUsed(token);
      await adminInviteService.invalidateAllByEmail(result.data.email);

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
      const page = Math.max(1, parseInt(str(req.query.page) || "1", 10) || 1);
      const limit = Math.min(100, parseInt(str(req.query.limit) || "10", 10) || 10);

      const result = await adminService.findAllAdmin(page, limit);
      console.log(result);
      
      res.status(200).json({
        success: true,
        message: "Admins fetched successfully",
        data: result.sanitizedData,
        total: result.total,
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
      const { accessToken, refreshToken, safeData, csrfToken } =
        await adminService.loginAdmin(result.data);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("csrfToken", csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
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
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.clearCookie("csrfToken", {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
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
      const adminDoc = req.authEntity;

      if (!adminDoc || adminDoc.role !== "admin") {
        throw new AppError("Forbidden", 403);
      }

      const { accessToken, refreshToken, csrfToken } =
        await adminService.postRefresh({
          id: adminDoc._id.toString(),
          role: adminDoc.role,
        });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("csrfToken", csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.status(200).json({
        success: true,
        message: "Tokens Refreshed Successfully",
        accessToken: accessToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req:Request, res:Response, next:NextFunction) {
    try {
    const id = str(req.user?.id);
    const result = changePasswordSchema.parse(req.body);
    const admin = await adminService.changePassword(id, result.currentPassword, result.newPassword);
    res.status(200).json({
      success:true,
      message:"Password changed Successfully",
      data: admin
    })
    } catch (error) {
      next(error)
    }
  }
};
