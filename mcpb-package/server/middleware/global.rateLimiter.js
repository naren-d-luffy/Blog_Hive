"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const env_config_1 = __importDefault(require("../config/env.config"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const rateLimiter_service_1 = require("../service/rateLimiter.service");
const GLOBAL_BUCKET_CAPACITY = env_config_1.default.GLOBAL_BUCKET_CAPACITY;
const GLOBAL_BUCKET_REFILL = env_config_1.default.GLOBAL_BUCKET_REFILLRATE;
const globalLimiter = (0, rateLimiter_service_1.createRateLimiter)(GLOBAL_BUCKET_CAPACITY, GLOBAL_BUCKET_REFILL);
exports.rateLimiter = (0, asyncHandler_1.default)(async (req, res, next) => {
    let result;
    try {
        const key = `rate:global:${req.ip}`;
        result = await globalLimiter.consume(key);
    }
    catch (error) {
        console.error("Global rate limiter unavailable, failing open", error);
        return next();
    }
    res.setHeader("X-RateLimit-Remaining", Math.floor(result.tokens));
    if (!result.allowed) {
        const retryAfter = Math.ceil((1 - result.tokens) / GLOBAL_BUCKET_REFILL);
        res.setHeader("Retry-After", Math.max(retryAfter, 1));
        throw new AppError_1.default("Too many requests", 429);
    }
    next();
});
