"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCsrf = void 0;
const AppError_1 = __importDefault(require("../utils/AppError"));
const user_repository_1 = require("../modules/User/user.repository");
const admin_repository_1 = require("../modules/Admin/admin.repository");
const generateToken_1 = require("../utils/generateToken");
const validateCsrf = async (req, res, next) => {
    try {
        const csrfHeader = req.headers["x-csrf-token"];
        const refreshToken = req.cookies.refreshToken;
        if (!csrfHeader || !refreshToken) {
            throw new AppError_1.default("Tokens missing", 403);
        }
        const hashedRefresh = (0, generateToken_1.hashToken)(refreshToken);
        let entity = await user_repository_1.userRepository.getSessionByRefreshToken(hashedRefresh);
        if (!entity) {
            entity = await admin_repository_1.adminRepository.getSessionByRefreshToken(hashedRefresh);
        }
        if (!entity || !entity.csrfToken || !entity.refreshToken) {
            throw new AppError_1.default("Invalid session", 403);
        }
        if (entity.refreshTokenExpiryAt && entity.refreshTokenExpiryAt.getTime() < Date.now()) {
            throw new AppError_1.default("Refresh token expired", 403);
        }
        const isCsrfValid = (0, generateToken_1.verifyToken)(csrfHeader, entity.csrfToken);
        if (!isCsrfValid) {
            throw new AppError_1.default("Invalid CSRF token", 403);
        }
        req.authEntity = entity;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateCsrf = validateCsrf;
