import env from "../config/env.config";
import { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "../service/rateLimiter.service";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";

const GOOGLE_BUCKET_CAPACITY = env.GOOGLE_BUCKET_CAPACITY;
const GOOGLE_BUCKET_REFILLRATE = env.GOOGLE_BUCKET_REFILLRATE;

const googleLimiter = createRateLimiter(
  GOOGLE_BUCKET_CAPACITY,
  GOOGLE_BUCKET_REFILLRATE,
);

/**
 * Rate limiter for Google OAuth endpoints (initiateAuth, callback, verifyToken).
 * Uses a token-bucket algorithm backed by Redis.
 * Fails closed — returns 503 when Redis is unavailable to prevent abuse.
 *
 * Default limits (overridable via env):
 *   GOOGLE_BUCKET_CAPACITY   = 10  (burst allowance)
 *   GOOGLE_BUCKET_REFILLRATE = 0.05 tokens/sec (~1 request every 20s steady state)
 */
export const googleRateLimiter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let result: { allowed: boolean; tokens: number };

    try {
      const key = `rate:google:${req.ip}`;
      result = await googleLimiter.consume(key);
    } catch (error) {
      console.error("Google rate limiter unavailable, failing closed", error);
      throw new AppError("Service temporarily unavailable", 503);
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil(
        (1 - result.tokens) / GOOGLE_BUCKET_REFILLRATE,
      );
      res.setHeader("Retry-After", Math.max(retryAfter, 1));
      throw new AppError("Too many Google OAuth requests", 429);
    }

    next();
  },
);
