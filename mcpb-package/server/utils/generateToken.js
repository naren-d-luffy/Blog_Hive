"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.hashToken = exports.generateToken = void 0;
const node_crypto_1 = require("node:crypto");
const AppError_1 = __importDefault(require("./AppError"));
const env_config_1 = __importDefault(require("../config/env.config"));
const HASH_TOKEN = env_config_1.default.HASH_TOKEN;
const generateToken = (options = {}) => {
    const { length = 32, encoding = "base64url", prefix = "" } = options;
    if (length <= 0) {
        throw new AppError_1.default("Token Length must be greater than 0", 400);
    }
    const buffer = (0, node_crypto_1.randomBytes)(length);
    let token;
    switch (encoding) {
        case "hex":
            token = buffer.toString("hex");
            break;
        case "base64url":
            token = buffer
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
            break;
        default:
            throw new AppError_1.default(`unsupported encoding:${encoding}`, 400);
    }
    return prefix ? `${prefix}${token}` : token;
};
exports.generateToken = generateToken;
const hashToken = (token) => {
    if (!token) {
        throw new AppError_1.default("Token is required", 400);
    }
    const hashedToken = (0, node_crypto_1.createHmac)("sha256", HASH_TOKEN).update(token, "utf8").digest("hex");
    return hashedToken;
};
exports.hashToken = hashToken;
const verifyToken = (token, storedHash) => {
    if (!token || !storedHash)
        return false;
    const hashedToken = (0, exports.hashToken)(token);
    const hasedBuffer = Buffer.from(hashedToken, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (hasedBuffer.length !== storedBuffer.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(hasedBuffer, storedBuffer);
};
exports.verifyToken = verifyToken;
