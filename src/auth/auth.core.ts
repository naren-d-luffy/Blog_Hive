import jwt, { JwtPayload } from "jsonwebtoken";
import env from "../config/env.config";
import { AuthUser } from "../types/auth.types";
import AppError from "../utils/AppError";

const ACCESS_SECRET = env.ACCESS_TOKEN;

export function verifyAccessToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;

    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "string" ||
      (decoded.role !== "admin" && decoded.role !== "user")
    ) {
      throw new AppError("Unauthorized: Invalid token payload", 401);
    }

    return {
      id: decoded.id,
      role: decoded.role,
    };
  } catch {
    throw new AppError("Unauthorized: Invalid or expired token", 401);
  }
}

export function authorizeRoles(
  user: AuthUser | undefined,
  ...allowedRoles: string[]
): void {
  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AppError("Forbidden", 403);
  }
}
