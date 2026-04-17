import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { loggerService } from "../modules/Logger/logger.service";

/**
 * Global HTTP Logger Middleware
 * Injects Request ID and captures req/res lifecycle asynchronously via Queue
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();

  // Attach requestId to response header
  res.setHeader("X-Request-Id", requestId);

  // When the request is finished, capture metrics and log
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    loggerService.captureHttp(req, res, durationMs).catch((err) => {
      console.error("Critical error in logger middleware:", err);
    });
  });

  next();
};