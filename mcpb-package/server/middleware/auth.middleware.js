"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authorize = exports.Authenticate = void 0;
const AppError_1 = __importDefault(require("../utils/AppError"));
const auth_core_1 = require("../auth/auth.core");
const Authenticate = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return next(new AppError_1.default("Unauthorized: No token provided", 401));
    }
    const token = auth.slice("Bearer ".length).trim();
    if (!token || token.includes(" ")) {
        return next(new AppError_1.default("Unauthorized: Invalid token", 401));
    }
    try {
        req.user = (0, auth_core_1.verifyAccessToken)(token);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.Authenticate = Authenticate;
const Authorize = (...roles) => {
    return (req, res, next) => {
        try {
            (0, auth_core_1.authorizeRoles)(req.user, ...roles);
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.Authorize = Authorize;
