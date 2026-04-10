import { Request, Response, NextFunction } from "express";
import { userService } from "./user.service";
import { userLoginSchema, createUserSchema, changePasswordSchema } from "./user.validator";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { str } from "../../utils/toString";

type IdRequest = Request<{ id: string }>;

export const userController = {
  async createuser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.message });
      }
      const user = await userService.createUser(result.data);

      res.status(201).json({
        success: true,
        message: "user Created Successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  async getalluser(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(str(req.query.page) || "1", 10) || 1);
      const limit = Math.min(100, parseInt(str(req.query.limit) || "10", 10) || 10);

      const result = await userService.findAllUser(page, limit);

      res.status(200).json({
        success: true,
        message: "users fetched successfully",
        data: result.sanitizedData,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  },

  async getuserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.user?.id;

      if (!id) {
        return next(new AppError("Id is required", 400));
      }

      const fetcheduser = await userService.findUserById(id);

      if (!fetcheduser) {
        return next(new AppError("user not Found or Deleted", 404));
      }
      res.status(200).json({
        success: true,
        message: "user fetched successfully",
        data: fetcheduser,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = userLoginSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.message });
      }
      const { accessToken, refreshToken, safeData, csrfToken } =
        await userService.loginUser(result.data);

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

      await userService.logoutUser(id);

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

  async updateStatus(req: IdRequest, res: Response, next: NextFunction) {
    try {
      const id = str(req.params.id);
      const { status } = req.body;

      const updated = await userService.updateStatus(id, status);
      res.status(200).json({
        success: true,
        message: "user status updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async softDelete(req: IdRequest, res: Response, next: NextFunction) {
    try {
      const id = str(req.params.id);

      const deleted = await userService.softDelete(id);

      res.status(200).json({
        success: true,
        message: "user deleted successfully",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userDoc = req.authEntity;
      if (!userDoc || userDoc.role !== "user") {
        throw new AppError("Forbidden", 403);
      }

      const { accessToken, refreshToken, csrfToken } =
        await userService.postRefresh({
          id: userDoc._id.toString(),
          role: userDoc.role,
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
      const user = await userService.changePassword(id, result.currentPassword, result.newPassword);
      res.status(200).json({
        success:true,
        message:"Password changed Successfully",
        data: user
      })
      } catch (error) {
        next(error)
      }
    }
};
