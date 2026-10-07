"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = void 0;
const crypto_1 = require("crypto");
const logger_service_1 = require("../modules/Logger/logger.service");
/**
 * Global HTTP Logger Middleware
 * Injects Request ID and captures req/res lifecycle asynchronously via Queue
 */
const httpLogger = (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers["x-request-id"] || (0, crypto_1.randomUUID)();
    // Attach requestId to response header
    res.setHeader("X-Request-Id", requestId);
    // When the request is finished, capture metrics and log
    res.on("finish", () => {
        const durationMs = Date.now() - start;
        logger_service_1.loggerService.captureHttp(req, res, durationMs).catch((err) => {
            console.error("Critical error in logger middleware:", err);
        });
    });
    next();
};
exports.httpLogger = httpLogger;
