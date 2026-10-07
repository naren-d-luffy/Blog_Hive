"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const redis_config_1 = require("./redis.config");
const gracefulShutdown = async (server) => {
    console.log("Shutting down gracefully...");
    try {
        if (server) {
            await new Promise((resolve) => server.close(() => {
                console.log("HTTP server closed");
                resolve();
            }));
        }
        await mongoose_1.default.connection.close();
        console.log("MongoDB connection closed");
        await redis_config_1.redisClient.quit();
        console.log("Redis connection closed");
        process.exit(0);
    }
    catch (error) {
        console.error("Error during shutdown", error);
        process.exit(1);
    }
};
exports.gracefulShutdown = gracefulShutdown;
