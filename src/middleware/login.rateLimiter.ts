import env from "../config/env.config";
import { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "../service/rateLimiter.service";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";

const LOGIN_BUCKET_CAPACITY = env.LOGIN_BUCKET_CAPACITY;
const LOGIN_BUCKET_REFILLRATE = env.LOGIN_BUCKET_REFILLRATE;

const loginLimiter = createRateLimiter( LOGIN_BUCKET_CAPACITY, LOGIN_BUCKET_REFILLRATE,);

export const loginRateLimiter = asyncHandler(async (req:Request, res:Response, next:NextFunction) => {
  let result: {allowed: boolean; tokens: number};
  
  try {
  const key = `rate:login:${req.ip}`; 
  result = await loginLimiter.consume(key);
  } catch (error) {
    console.error("Login rate limiter unavailable, failing closed", error);
    throw new AppError("Service temporarily unavailable", 503);
  }
  if (!result.allowed) {
    const retryAfter = Math.ceil((1-result.tokens)/LOGIN_BUCKET_REFILLRATE);
    res.setHeader("Retry-After", Math.max(retryAfter,1));
    throw new AppError("Too many login attempts", 429);
  }

  next();
});