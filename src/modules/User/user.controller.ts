import { Request, Response, NextFunction } from "express";
import { userService } from "./user.service";
import { userLoginSchema, createUserSchema } from "./user.validator";
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await userService.findAllUser(page, limit);

      res.status(200).json({
        success: true,
        message: "users fetched successfully",
        data: result,
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
      const { accessToken, refreshToken, safeData } =
        await userService.loginUser(result.data);

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
      const token = req.cookies?.refreshToken;
      if (!token) return res.status(401).json({ message: "Token is required" });

      const { accessToken, refreshToken, safeData } =
        await userService.postRefresh(token);

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
          user: safeData,
        });
    } catch (error) {
      next(error);
    }
  },
};
