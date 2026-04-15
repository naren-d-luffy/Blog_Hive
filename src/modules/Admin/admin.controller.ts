import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { adminLoginSchema, changePasswordSchema, createAdminSchema, resetPasswordSchema,} from "./admin.validator";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { str } from "../../utils/toString";
import { tokenService } from "../Token/token.service";
import { forgotPasswordSchema } from "../Token/token.validator";
import { TokenType } from "../Token/token.interface";
import asyncHandler from "../../utils/asyncHandler";


export const adminController = {
   createAdmin: asyncHandler (async (req: Request, res: Response) => {
      const { token } = req.body;
      if (!token) {
        throw new AppError("Invite token is required", 400)
      }
      const type = TokenType.ADMIN_INVITE;
      const isValid = await tokenService.verifyToken(token, type);
      if (!isValid) {
        throw new AppError("Invalid or expired invite token", 400)
      }

      const result = createAdminSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.message });
      }
      const admin = await adminService.createAdmin(result.data);

      await tokenService.markInviteAsUsed(token);
      await tokenService.invalidateAllByEmail(result.data.email);

      res.status(201).json({
        success: true,
        message: "Admin Created Successfully",
        data: admin,
      })
  }),

  getallAdmin: asyncHandler (async (req: Request, res: Response) => {
      const page = Math.max(1, parseInt(str(req.query.page) || "1", 10) || 1);
      const limit = Math.min(
        100,
        parseInt(str(req.query.limit) || "10", 10) || 10,
      );

      const result = await adminService.findAllAdmin(page, limit);
      console.log(result);

      res.status(200).json({
        success: true,
        message: "Admins fetched successfully",
        data: result.sanitizedData,
        total: result.total,
      });
  }),

  getCurrentAdmin: asyncHandler (async (req: Request, res: Response) => {
      const user = req.user;

      if (!user || user.role !== "admin") {
        throw new AppError("Unauthorized access", 401);
      }

      const fetchedAdmin = await adminService.findAdminById(user.id);

      if (!fetchedAdmin) {
        throw new AppError("Admin not Found or Deleted", 404);
      }
      res.status(200).json({
        success: true,
        message: "Admin fetched successfully",
        data: fetchedAdmin,
      });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
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
  }),

  logout: asyncHandler (async (req: Request, res: Response) => {
      const user = req.user;

      if (!user || user.role !== "admin") {
        throw new AppError("Unauthorized access", 401);
      }

      await adminService.logoutAdmin(user.id);

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
  }),

  updateStatus: asyncHandler (async (req: Request, res: Response) => {
      const id = str(req.params.id);
      const { status } = req.body;

      const updated = await adminService.updateStatus(id, status);
      res.status(200).json({
        success: true,
        message: "Admin status updated successfully",
        data: updated,
      });
  }),

  softDelete: asyncHandler (async (req: Request, res: Response) => {
      const id = str(req.params.id);

      const deleted = await adminService.softDelete(id);

      res.status(200).json({
        success: true,
        message: "Admin deleted successfully",
        data: deleted,
      });
  }),

  refreshToken: asyncHandler (async (req: Request, res: Response) => {
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
  }),

  changePassword: asyncHandler (async (req: Request, res: Response) => {
      const user = req.user;

      if (!user || user.role !== "admin") {
        throw new AppError("Unauthorized access", 401);
      }
      const result = changePasswordSchema.parse(req.body);
      const admin = await adminService.changePassword(
        user.id,
        result.currentPassword,
        result.newPassword,
      );
      res.status(200).json({
        success: true,
        message: "Password changed Successfully",
        data: admin,
      });
  }),

  forgotPassword: asyncHandler (async (req: Request, res: Response) => {
      const parsed = forgotPasswordSchema.parse(req.body);

      await tokenService.forgotPassword(parsed.email);

      res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
  }),

  resetPassword: asyncHandler (async (req: Request, res: Response) => {
      const parsed = resetPasswordSchema.parse(req.body);

      await tokenService.resetPassword(parsed.token, parsed.newPassword);

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
  }),
};
