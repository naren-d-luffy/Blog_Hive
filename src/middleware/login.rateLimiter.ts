import env from "../config/env.config";
import { Request, Response, NextFunction } from "express";
import { createTokenBucket } from "../service/rateLimiter.service";

const LOGIN_BUCKET_CAPACITY = env.LOGIN_BUCKET_CAPACITY;
const LOGIN_BUCKET_REFILLRATE = env.LOGIN_BUCKET_REFILLRATE;

const loginbucket = createTokenBucket( LOGIN_BUCKET_CAPACITY, LOGIN_BUCKET_REFILLRATE,);

export const loginRateLimiter = async ( req: Request, res: Response, next: NextFunction,) => {
  try {
    const key = `login:${req.ip}`;
    const allowed = await loginbucket.consume(key);

    if (!allowed) {
      res.status(403).json({
        success: false,
        message: "Too many login attempts. Try again later.",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};
