import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import { verifyAccessToken, authorizeRoles, authorizeScopes } from "../auth/auth.core";

export const Authenticate = (req: Request,res: Response,next: NextFunction,): void => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return next(
      new AppError("Unauthorized: No token provided", 401),
    );
  }

  const token = auth.slice("Bearer ".length).trim();

  if (!token || token.includes(" ")) {
    return next(
      new AppError("Unauthorized: Invalid token", 401),
    );
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const Authorize = (...roles: string[]) => {
  return (req: Request,res: Response,next: NextFunction,): void => {
    try {
      authorizeRoles(req.user, ...roles);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const RequireScope = (...scopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      authorizeScopes(req.user, ...scopes);
      next();
    } catch (error) {
      next(error);
    }
  };
};