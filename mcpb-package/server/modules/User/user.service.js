"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const env_config_1 = __importDefault(require("../../config/env.config"));
const user_repository_1 = require("./user.repository");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = __importDefault(require("../../utils/AppError"));
const CheckId_1 = __importDefault(require("../../utils/CheckId"));
const redis_config_1 = require("../../config/redis.config");
const generateToken_1 = require("../../utils/generateToken");
const token_service_1 = require("../Token/token.service");
const token_interface_1 = require("../Token/token.interface");
const cursor_1 = require("../../utils/Cursor/cursor");
const ACCESS_SECRET = env_config_1.default.ACCESS_TOKEN;
const FAILURE_COUNT = env_config_1.default.LOGIN_FAILURE_COUNT;
const LOCK_UNTIL_TIME = env_config_1.default.LOCK_UNTIL_TIME * 60 * 1000;
exports.userService = {
    sanitizeUser(user) {
        if (!user)
            return null;
        return {
            id: user?._id,
            name: user?.name,
            email: user?.email,
            role: user?.role,
            status: user?.status,
            lastLogin: user?.lastLogin,
        };
    },
    async createUser(user) {
        const hashed = await bcrypt_1.default.hash(user.password, 10);
        const newUser = await user_repository_1.userRepository.create({
            ...user,
            password: hashed,
            role: "user",
            status: "active",
            isVerified: false,
        });
        await token_service_1.tokenService.createVerifyUserToken(newUser.email, newUser.id);
        return this.sanitizeUser(newUser);
    },
    async findAllUser(cursor, limit) {
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `users:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const data = await user_repository_1.userRepository.findAll(decodedCursor, limit + 1);
        const hasNextPage = data.length > limit;
        const users = hasNextPage ? data.slice(0, limit) : data;
        const sanitizedData = users.map((user) => this.sanitizeUser(user));
        let nextCursor = null;
        if (hasNextPage) {
            const lastUser = users.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
                createdAt: lastUser.createdAt.toISOString(),
                id: lastUser._id.toString(),
            });
        }
        const result = {
            sanitizedData,
            limit,
            hasNextPage,
            nextCursor,
        };
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async findUserById(id) {
        (0, CheckId_1.default)(id);
        const cacheKey = `user:${id}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const result = await user_repository_1.userRepository.findById(id);
        const sanitizedResult = this.sanitizeUser(result);
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(sanitizedResult), "EX", 60);
        return sanitizedResult;
    },
    async loginUser(credentials) {
        const { email, password } = credentials;
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user)
            throw new AppError_1.default("Invalid credentials", 401);
        if (user.status === "inactive") {
            throw new AppError_1.default("User is Inactive, contact Super User", 403);
        }
        if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
            throw new AppError_1.default("Account is locked, Try again later", 403);
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempt += 1;
            if (user.failedLoginAttempt >= FAILURE_COUNT) {
                user.lockUntil = new Date(Date.now() + LOCK_UNTIL_TIME);
            }
            await user_repository_1.userRepository.save(user);
            throw new AppError_1.default("Invalid Credentials", 401);
        }
        user.lockUntil = null;
        user.failedLoginAttempt = 0;
        user.lastLogin = new Date();
        //CSRF Handler
        const csrfToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedCsrf = (0, generateToken_1.hashToken)(csrfToken);
        user.csrfToken = hashedCsrf;
        //Access and Refresh Handler
        const payload = { id: user.id, role: user.role };
        const accessToken = jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
        const refreshToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedRefresh = (0, generateToken_1.hashToken)(refreshToken);
        user.refreshToken = hashedRefresh;
        user.refreshTokenExpiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await user_repository_1.userRepository.save(user);
        const safeData = this.sanitizeUser(user);
        return { accessToken, refreshToken, safeData, csrfToken };
    },
    async logoutUser(id) {
        (0, CheckId_1.default)(id);
        const user = await user_repository_1.userRepository.findById(id);
        if (!user)
            throw new AppError_1.default("User not found or deleted", 404);
        user.refreshToken = null;
        await user_repository_1.userRepository.save(user);
        return;
    },
    async updateStatus(id, status) {
        (0, CheckId_1.default)(id);
        const updated = await user_repository_1.userRepository.update(id, { status });
        if (!updated)
            throw new AppError_1.default("Error updating the User status", 400);
        const sanitizedData = this.sanitizeUser(updated);
        await redis_config_1.redisClient.del(`user:${id}`);
        return sanitizedData;
    },
    async softDelete(id) {
        (0, CheckId_1.default)(id);
        const deleted = await user_repository_1.userRepository.softDelete(id);
        if (!deleted)
            throw new AppError_1.default("Error Deleting User", 400);
        const sanitizedUser = this.sanitizeUser(deleted);
        await redis_config_1.redisClient.del(`user:${id}`);
        return sanitizedUser;
    },
    async postRefresh(user) {
        const csrfToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedCsrf = (0, generateToken_1.hashToken)(csrfToken);
        let payload = { id: user.id, role: user.role };
        const accessToken = jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
        const refreshToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedRefresh = (0, generateToken_1.hashToken)(refreshToken);
        const refreshTokenExpiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await user_repository_1.userRepository.update(user.id, {
            refreshToken: hashedRefresh,
            refreshTokenExpiryAt,
            csrfToken: hashedCsrf,
        });
        return { accessToken, refreshToken, csrfToken };
    },
    async changePassword(id, currentPassword, newPassword) {
        const user = await user_repository_1.userRepository.getPasswordById(id);
        if (!user)
            throw new AppError_1.default("User not found", 400);
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new AppError_1.default("Invalid current password", 400);
        }
        const isSameAsOld = await bcrypt_1.default.compare(newPassword, user.password);
        if (isSameAsOld) {
            throw new AppError_1.default("New password cannot be same as old password", 400);
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        const updatedUser = await user_repository_1.userRepository.update(id, {
            password: hashed,
            refreshToken: null,
            csrfToken: null,
            lockUntil: null,
            failedLoginAttempt: 0,
            lastLogin: new Date(),
        });
        const sanitized = this.sanitizeUser(updatedUser);
        return sanitized;
    },
    async verifyUser(token) {
        const verifiedData = await token_service_1.tokenService.verifyToken(token, token_interface_1.TokenType.EMAIL_VERIFICATION);
        if (!verifiedData || !verifiedData.user) {
            throw new AppError_1.default("Invalid or malformed token", 400);
        }
        return await user_repository_1.userRepository.update(verifiedData.user.toString(), {
            isVerified: true,
        });
    },
};
