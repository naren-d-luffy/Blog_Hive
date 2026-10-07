"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const error_middleware_1 = __importDefault(require("./middleware/error.middleware"));
const index_1 = __importDefault(require("./router/index"));
const global_rateLimiter_1 = require("./middleware/global.rateLimiter");
const mongoose_1 = __importDefault(require("mongoose"));
const redis_config_1 = require("./config/redis.config");
const cors_config_1 = __importDefault(require("./config/cors.config"));
const app = (0, express_1.default)();
// app.use(httpLogger);
app.use((0, helmet_1.default)());
app.use(cors_config_1.default);
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "10kb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(global_rateLimiter_1.rateLimiter);
app.get("/", (req, res) => {
    res.json({ message: "Api is running fine." });
});
app.get("/health", async (req, res) => {
    const checks = {
        db: mongoose_1.default.connection.readyState === 1 ? "ok" : "failing",
        redis: redis_config_1.redisClient.status === "ready" ? "ok" : "failing",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    };
    const healthy = checks.db === "ok" && checks.redis === "ok";
    res.status(healthy ? 200 : 503).json(checks);
});
app.use("/api/v1", index_1.default);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});
app.use(error_middleware_1.default);
exports.default = app;
