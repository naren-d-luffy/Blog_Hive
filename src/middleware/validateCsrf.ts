import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import { userRepository } from "../modules/User/user.repository";
import { adminRepository } from "../modules/Admin/admin.repository";
import { hashToken, verifyToken } from "../utils/generateToken";

export const validateCsrf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const csrfHeader = req.headers["x-csrf-token"] as string;
    const refreshToken = req.cookies.refreshToken;

    if (!csrfHeader || !refreshToken) {
      throw new AppError("Tokens missing", 403);
    }

    const hashedRefresh = hashToken(refreshToken);

    let entity: any = await userRepository.getSessionByRefreshToken(hashedRefresh);
    if (!entity) {
      entity = await adminRepository.getSessionByRefreshToken(hashedRefresh);
    }

    if (!entity || !entity.csrfToken || !entity.refreshToken) {
      throw new AppError("Invalid session", 403);
    }

    if (entity.refreshTokenExpiryAt && entity.refreshTokenExpiryAt.getTime() < Date.now()) {
      throw new AppError("Refresh token expired", 403);
    }

    const isCsrfValid = verifyToken(csrfHeader, entity.csrfToken);
    if (!isCsrfValid) {
      throw new AppError("Invalid CSRF token", 403);
    }

    req.authEntity = entity;
    next();
  } catch (error) {
    next(error);
  }
};
