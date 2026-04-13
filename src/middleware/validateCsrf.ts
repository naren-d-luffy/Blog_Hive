import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../types/auth.types";
import AppError from "../utils/AppError";
import env from "../config/env.config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { userRepository } from "../modules/User/user.repository";
import { adminRepository } from "../modules/Admin/admin.repository";

const REFRESH_SECRET = env.REFRESH_TOKEN;

export const validateCsrf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const csrfHeader = req.headers["x-csrf-token"] as string;
    const refreshToken = req.cookies.refreshToken;

    if (!csrfHeader || !refreshToken) {
      throw new AppError("CSRF token missing", 403);
    }

    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as AuthUser;

    let entity;
    if (payload.role === "admin") {
      entity = await adminRepository.getSessionById(payload.id);
    } else {
      entity = await userRepository.getSessionById(payload.id);
    }

    if (!entity || !entity.csrfToken || !entity.refreshToken) {
      throw new AppError("Invalid session", 403);
    }

    const isRefreshValid = await bcrypt.compare(refreshToken, entity.refreshToken);
    if (!isRefreshValid) {
      throw new AppError("Invalid session", 403);
    }

    const isCsrfValid = await bcrypt.compare(csrfHeader, entity.csrfToken);
    if (!isCsrfValid) {
      throw new AppError("Invalid CSRF token", 403);
    }

    req.authEntity = entity;
    next();
  } catch (error) {
    next(error);
  }
};
