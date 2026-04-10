import env from "../config/env.config";
import { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "../service/rateLimiter.service";

const GLOBAL_BUCKET_CAPACITY = env.GLOBAL_BUCKET_CAPACITY;
const GLOBAL_BUCKET_REFILL = env.GLOBAL_BUCKET_REFILLRATE;

const globalLimiter = createRateLimiter(GLOBAL_BUCKET_CAPACITY,GLOBAL_BUCKET_REFILL);

export const rateLimiter = async (req:Request, res:Response, next:NextFunction) => {
  const key = `rate:global:${req.ip}`;

  const { allowed, tokens } = await globalLimiter.consume(key);

  res.setHeader("X-RateLimit-Remaining", tokens);

  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  }

  next();
};
