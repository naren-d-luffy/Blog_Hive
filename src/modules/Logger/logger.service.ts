import { logQueue } from "../../config/queue.config";
import { LOG_JOBS } from "../../queues/log.queue";
import { ILogSchema } from "./logger.interface";
import env from "../../config/env.config";
import { Request, Response } from "express";

class LoggerService {
  private serviceName = "BlogService";

  /**
   * Manually add a log to the queue
   */
  async log(level: ILogSchema["level"], message: string, context: Partial<ILogSchema> = {}) {
    const logData: ILogSchema = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      environment: env.NODE_ENV,
      request: {
        requestId: context.request?.requestId || "N/A",
        method: context.request?.method || "N/A",
        endpoint: context.request?.endpoint || "N/A",
        action: context.request?.action || null,
        ip: context.request?.ip || "127.0.0.1",
      },
      user: {
        userId: context.user?.userId || null,
        role: context.user?.role || null,
      },
      response: {
        statusCode: context.response?.statusCode || 0,
        success: context.response?.success !== undefined ? context.response.success : true,
        durationMs: context.response?.durationMs || 0,
      },
      error: context.error || null,
      metadata: {
        message,
        ...context.metadata,
      },
    };

    try {
      await logQueue.add(LOG_JOBS.WRITE_LOG, logData, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      });
    } catch (err) {
      // If queue fails, fallback to console so we don't lose critical logs
      console.error("CRITICAL: Failed to enqueue log:", err, logData);
    }
  }

  // Helper methods
  info(message: string, metadata?: any) { return this.log("INFO", message, { metadata }); }
  warn(message: string, metadata?: any) { return this.log("WARN", message, { metadata }); }
  error(message: string, metadata?: any) { return this.log("ERROR", message, { metadata }); }
  debug(message: string, metadata?: any) { return this.log("DEBUG", message, { metadata }); }

  /**
   * Captures full Request/Response lifecycle log
   */
  async captureHttp(req: Request, res: Response, durationMs: number) {
    const errorObj = (res.locals as any).error;
    
    // Determine level
    let level: ILogSchema["level"] = "INFO";
    if (res.statusCode >= 500 || errorObj) level = "ERROR";
    else if (res.statusCode >= 400) level = "WARN";

    // Extract action if possible
    const action = req.logMetadata?.action || (req as any).route?.path || null;

    await this.log(level, `${req.method} ${req.originalUrl || req.url}`, {
      request: {
        requestId: (res.getHeader("X-Request-Id") as string) || "N/A",
        method: req.method,
        endpoint: req.originalUrl || req.url,
        action,
        ip: req.ip || req.socket.remoteAddress || "127.0.0.1",
      },
      user: {
        userId: req.user?.id || null,
        role: req.user?.role || null,
      },
      response: {
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        durationMs,
      },
      error: errorObj ? {
        code: errorObj.statusCode?.toString() || errorObj.code?.toString() || "INTERNAL_ERROR",
        message: errorObj.message || "Unknown Error",
        stack: env.NODE_ENV === "development" ? errorObj.stack : null,
      } : null,
      metadata: req.logMetadata,
    });
  }
}

export const loggerService = new LoggerService();
