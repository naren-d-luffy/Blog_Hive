import { Request, Response, NextFunction } from "express";
import env from "../config/env.config";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.locals.error = err; // Storing err for logger
  console.error("ERROR:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors: string[] = [];

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values(err.errors).map((val: any) => val.message);
    message = "Validation failed";
  }

  if (env.NODE_ENV === "production" && statusCode === 500) {
    message = "Something went wrong";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.NODE_ENV === "development" && { stack: err.stack, details: err.details || err }),
  });
};

export default errorHandler;