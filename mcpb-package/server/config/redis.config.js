"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.connectRedis = connectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_config_1 = __importDefault(require("./env.config"));
exports.redisClient = new ioredis_1.default({
    host: env_config_1.default.REDIS_HOST || "127.0.0.1",
    port: Number(env_config_1.default.REDIS_PORT) || 6379,
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        if (times > 10) {
            console.error("Redis retry attempts exhausted.");
            return null;
        }
        return Math.min(times * 500, 5000);
    },
});
exports.redisClient.on("connect", () => { console.log("Redis connected"); });
exports.redisClient.on("ready", () => { console.log("Redis ready"); });
exports.redisClient.on("reconnecting", () => { console.log("Redis reconnecting..."); });
exports.redisClient.on("error", (err) => { console.error("Redis error:", err); });
async function connectRedis() {
    try {
        await exports.redisClient.connect();
    }
    catch (err) {
        console.error("Failed to connect to Redis:", err);
        process.exit(1);
    }
}
