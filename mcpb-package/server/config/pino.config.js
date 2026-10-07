"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const env_config_1 = __importDefault(require("./env.config"));
const pinoLogger = (0, pino_1.default)({
    level: env_config_1.default.LOG_LEVEL || "info",
    transport: env_config_1.default.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
            },
        }
        : undefined,
});
exports.default = pinoLogger;
