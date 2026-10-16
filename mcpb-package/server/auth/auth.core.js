"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = verifyAccessToken;
exports.authorizeRoles = authorizeRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_1 = __importDefault(require("../config/env.config"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const ACCESS_SECRET = env_config_1.default.ACCESS_TOKEN;
function verifyAccessToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
        if (typeof decoded === "string" ||
            typeof decoded.id !== "string" ||
            (decoded.role !== "admin" && decoded.role !== "user")) {
            throw new AppError_1.default("Unauthorized: Invalid token payload", 401);
        }
        return {
            id: decoded.id,
            role: decoded.role,
        };
    }
    catch {
        throw new AppError_1.default("Unauthorized: Invalid or expired token", 401);
    }
}
function authorizeRoles(user, ...allowedRoles) {
    if (!user) {
        throw new AppError_1.default("Unauthorized", 401);
    }
    if (!allowedRoles.includes(user.role)) {
        throw new AppError_1.default("Forbidden", 403);
    }
}
