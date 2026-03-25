import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.config";
import AppError from "../utils/AppError";
import { AuthUser } from "../types/auth.types";

const ACCESS_SECRET = env.ACCESS_TOKEN;

export const Authenticate = (req: Request,res: Response,next: NextFunction,): void => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return next(new AppError("unauthorized: No token provided", 401));
  }

  const token = auth.split(" ")[1];

  try {
    const decode = jwt.verify(token, ACCESS_SECRET) as AuthUser;
    req.user = decode;

    next();
  } catch (error) {
    return next(
      new AppError("Unauthorized: Invalid or expired token", 401, { error }),
    );
  }
};

export const Authorize = (...role: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!role.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
};