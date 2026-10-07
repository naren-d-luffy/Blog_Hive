"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimiter = void 0;
const env_config_1 = __importDefault(require("../config/env.config"));
const rateLimiter_service_1 = require("../service/rateLimiter.service");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const LOGIN_BUCKET_CAPACITY = env_config_1.default.LOGIN_BUCKET_CAPACITY;
const LOGIN_BUCKET_REFILLRATE = env_config_1.default.LOGIN_BUCKET_REFILLRATE;
const loginLimiter = (0, rateLimiter_service_1.createRateLimiter)(LOGIN_BUCKET_CAPACITY, LOGIN_BUCKET_REFILLRATE);
exports.loginRateLimiter = (0, asyncHandler_1.default)(async (req, res, next) => {
    let result;
    try {
        const key = `rate:login:${req.ip}`;
        result = await loginLimiter.consume(key);
    }
    catch (error) {
        console.error("Login rate limiter unavailable, failing closed", error);
        throw new AppError_1.default("Service temporarily unavailable", 503);
    }
    if (!result.allowed) {
        const retryAfter = Math.ceil((1 - result.tokens) / LOGIN_BUCKET_REFILLRATE);
        res.setHeader("Retry-After", Math.max(retryAfter, 1));
        throw new AppError_1.default("Too many login attempts", 429);
    }
    next();
});
