import { Request, Response, NextFunction } from "express";
import env from "../config/env.config";
import AppError from "../utils/AppError";

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

interface ValidationError extends Error {
  errors: Record<string, { message: string }>;
}

type ExpressError = AppError | MongoError | ValidationError | Error;

const errorHandler = (
  err: ExpressError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.locals.error = err; // Storing err for logger
  console.error("ERROR:", err);

  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || "Internal Server Error";
  let errors: string[] = [];

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  if ((err as MongoError).code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values((err as ValidationError).errors).map((val) => val.message);
    message = "Validation failed";
  }

  if (env.NODE_ENV === "production" && statusCode === 500) {
    message = "Something went wrong";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err instanceof AppError ? err.details : undefined,
    }),
  });
};

export default errorHandler;