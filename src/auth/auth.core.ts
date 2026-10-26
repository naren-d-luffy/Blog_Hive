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
      scope: typeof decoded.scope === "string" ? decoded.scope : undefined,
      clientId: typeof decoded.clientId === "string" ? decoded.clientId : undefined,
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

export function authorizeScopes(
  user: AuthUser | undefined,
  ...requiredScopes: string[]
): void {
  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  // If token has no scope (standard full-access web session), pass through
  if (!user.scope) {
    return;
  }

  const tokenScopes = user.scope.split(" ").filter(Boolean);
  const hasAll = requiredScopes.every((scope) => tokenScopes.includes(scope));

  if (!hasAll) {
    throw new AppError(
      `Forbidden: Missing required scope(s): ${requiredScopes.join(" ")}`,
      403,
    );
  }
}

