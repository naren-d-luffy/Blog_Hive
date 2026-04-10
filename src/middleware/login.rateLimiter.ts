import env from "../config/env.config";
import { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "../service/rateLimiter.service";

const LOGIN_BUCKET_CAPACITY = env.LOGIN_BUCKET_CAPACITY;
const LOGIN_BUCKET_REFILLRATE = env.LOGIN_BUCKET_REFILLRATE;

const loginLimiter = createRateLimiter( LOGIN_BUCKET_CAPACITY, LOGIN_BUCKET_REFILLRATE,);

export const loginRateLimiter = async (req:Request, res:Response, next:NextFunction) => {
  const key = `rate:login:${req.ip}`; 

  const { allowed } = await loginLimiter.consume(key);

  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many login attempts",
    });
  }

  next();
};