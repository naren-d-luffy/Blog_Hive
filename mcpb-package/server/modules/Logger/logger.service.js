"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerService = void 0;
const queue_config_1 = require("../../config/queue.config");
const log_queue_1 = require("../../queues/log.queue");
const env_config_1 = __importDefault(require("../../config/env.config"));
class LoggerService {
    serviceName = "BlogService";
    /**
     * Manually add a log to the queue
     */
    async log(level, message, context = {}) {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            environment: env_config_1.default.NODE_ENV,
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
            await queue_config_1.logQueue.add(log_queue_1.LOG_JOBS.WRITE_LOG, logData, {
                removeOnComplete: true,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 1000,
                },
            });
        }
        catch (err) {
            // If queue fails, fallback to console so we don't lose critical logs
            console.error("CRITICAL: Failed to enqueue log:", err, logData);
        }
    }
    // Helper methods
    info(message, metadata) { return this.log("INFO", message, { metadata }); }
    warn(message, metadata) { return this.log("WARN", message, { metadata }); }
    error(message, metadata) { return this.log("ERROR", message, { metadata }); }
    debug(message, metadata) { return this.log("DEBUG", message, { metadata }); }
    /**
     * Captures full Request/Response lifecycle log
     */
    async captureHttp(req, res, durationMs) {
        const errorObj = res.locals.error;
        // Determine level
        let level = "INFO";
        if (res.statusCode >= 500 || errorObj)
            level = "ERROR";
        else if (res.statusCode >= 400)
            level = "WARN";
        // Extract action if possible
        const action = req.logMetadata?.action || req.route?.path || null;
        await this.log(level, `${req.method} ${req.originalUrl || req.url}`, {
            request: {
                requestId: res.getHeader("X-Request-Id") || "N/A",
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
                stack: env_config_1.default.NODE_ENV === "development" ? errorObj.stack : null,
            } : null,
            metadata: req.logMetadata,
        });
    }
}
exports.loggerService = new LoggerService();
