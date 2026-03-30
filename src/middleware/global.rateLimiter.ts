import env from "../config/env.config";
import { Request, Response, NextFunction } from "express";
import { createTokenBucket } from "../service/rateLimiter.service";

const GLOBAL_BUCKET_CAPACITY = env.GLOBAL_BUCKET_CAPACITY;
const GLOBAL_BUCKET_REFILL = env.GLOBAL_BUCKET_REFILLRATE;

const globalBucket = createTokenBucket(GLOBAL_BUCKET_CAPACITY,GLOBAL_BUCKET_REFILL);

export const rateLimiter = async ( req: Request, res: Response, next: NextFunction,) => {
  try {
    const key = `rate:${req.ip}`;
    const allowed = await globalBucket.consume(key);

    if (!allowed) {
      res.status(403).json({
        success: false,
        message: "Too many request, try again later.",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};
