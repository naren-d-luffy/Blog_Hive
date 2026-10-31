import env from "../config/env.config";
import asyncHandler from "../utils/asyncHandler";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";
import { createRateLimiter } from "../service/rateLimiter.service";

const GLOBAL_BUCKET_CAPACITY = env.GLOBAL_BUCKET_CAPACITY;
const GLOBAL_BUCKET_REFILL = env.GLOBAL_BUCKET_REFILLRATE;

const globalLimiter = createRateLimiter(
  GLOBAL_BUCKET_CAPACITY,
  GLOBAL_BUCKET_REFILL,
);

export const rateLimiter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let result: { allowed:boolean; tokens:number };
    try {
      const key = `rate:global:${req.ip}`;
      result = await globalLimiter.consume(key);
    } catch (error) {
      console.error("Global rate limiter unavailable, failing open", error);
      return next();
    }

    res.setHeader("X-RateLimit-Remaining", Math.floor(result.tokens));

    if (!result.allowed) {
      const retryAfter = Math.ceil((1-result.tokens)/GLOBAL_BUCKET_REFILL)
      res.setHeader("Retry-After", Math.max(retryAfter,1));
      throw new AppError("Too many requests",429)
    }

    next();
  });
