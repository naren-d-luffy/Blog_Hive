"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authorize = exports.Authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_1 = __importDefault(require("../config/env.config"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const ACCESS_SECRET = env_config_1.default.ACCESS_TOKEN;
const Authenticate = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return next(new AppError_1.default("unauthorized: No token provided", 401));
    }
    const token = auth.split(" ")[1];
    try {
        const decode = jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
        req.user = decode;
        next();
    }
    catch (error) {
        return next(new AppError_1.default("Unauthorized: Invalid or expired token", 401, { error }));
    }
};
exports.Authenticate = Authenticate;
const Authorize = (...role) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError_1.default("Unauthorized", 401));
        }
        if (!role.includes(req.user.role)) {
            return next(new AppError_1.default("Forbidden", 403));
        }
        next();
    };
};
exports.Authorize = Authorize;
