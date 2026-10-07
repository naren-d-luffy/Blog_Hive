"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = void 0;
const env_config_1 = __importDefault(require("../../config/env.config"));
const admin_repository_1 = require("./admin.repository");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = __importDefault(require("../../utils/AppError"));
const CheckId_1 = __importDefault(require("../../utils/CheckId"));
const redis_config_1 = require("../../config/redis.config");
const generateToken_1 = require("../../utils/generateToken");
const cursor_1 = require("../../utils/Cursor/cursor");
const ACCESS_SECRET = env_config_1.default.ACCESS_TOKEN;
const FAILURE_COUNT = env_config_1.default.LOGIN_FAILURE_COUNT;
const LOCK_UNTIL_TIME = env_config_1.default.LOCK_UNTIL_TIME * 60 * 1000;
exports.adminService = {
    sanitizeAdmin(admin) {
        if (!admin)
            return null;
        return {
            id: admin?._id,
            name: admin?.name,
            email: admin?.email,
            role: admin?.role,
            status: admin?.status,
            lastLogin: admin?.lastLogin,
        };
    },
    async createAdmin(admin) {
        const hashed = await bcrypt_1.default.hash(admin.password, 10);
        const newAdmin = await admin_repository_1.adminRepository.create({
            ...admin,
            password: hashed,
            role: "admin",
            status: "active",
        });
        return this.sanitizeAdmin(newAdmin);
    },
    async findAllAdmin(cursor, limit) {
        const decodedCursor = cursor ? (0, cursor_1.decodeCursor)(cursor) : undefined;
        const cacheKey = `admin:cursor:${cursor ?? "initial"}:limit:${limit}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const data = await admin_repository_1.adminRepository.findAll(decodedCursor, limit + 1);
        const hasNextPage = data.length > limit;
        const admins = hasNextPage ? data.slice(0, limit) : data;
        const sanitizedData = admins.map((admin) => this.sanitizeAdmin(admin));
        let nextCursor = null;
        if (hasNextPage) {
            const lastUser = admins.at(-1);
            nextCursor = (0, cursor_1.encodeCursor)({
                createdAt: lastUser.createdAt.toISOString(),
                id: lastUser._id.toString()
            });
        }
        const result = {
            sanitizedData,
            limit,
            hasNextPage,
            nextCursor
        };
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(result), "EX", 60);
        return result;
    },
    async findAdminById(id) {
        (0, CheckId_1.default)(id);
        const cacheKey = `admin:${id}`;
        const cached = await redis_config_1.redisClient.get(cacheKey);
        if (cached) {
            console.log("Cache hit");
            return JSON.parse(cached);
        }
        const result = await admin_repository_1.adminRepository.findById(id);
        const sanitizedResult = this.sanitizeAdmin(result);
        await redis_config_1.redisClient.set(cacheKey, JSON.stringify(sanitizedResult), "EX", 60);
        return sanitizedResult;
    },
    async loginAdmin(credentials) {
        const { email, password } = credentials;
        const admin = await admin_repository_1.adminRepository.findByEmailWithPassword(email);
        if (!admin)
            throw new AppError_1.default("Invalid credentials", 401);
        if (admin.status === "inactive") {
            throw new AppError_1.default("Admin is Inactive, contact Super Admin", 403);
        }
        if (admin.lockUntil && admin.lockUntil.getTime() > Date.now()) {
            throw new AppError_1.default("Account is locked, Try again later", 403);
        }
        const isMatch = await bcrypt_1.default.compare(password, admin.password);
        if (!isMatch) {
            admin.failedLoginAttempt += 1;
            if (admin.failedLoginAttempt >= FAILURE_COUNT) {
                admin.lockUntil = new Date(Date.now() + LOCK_UNTIL_TIME);
            }
            await admin_repository_1.adminRepository.save(admin);
            throw new AppError_1.default("Invalid Credentials", 401);
        }
        admin.lockUntil = null;
        admin.failedLoginAttempt = 0;
        admin.lastLogin = new Date();
        //CSFR Handling
        const csrfToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedCsrf = (0, generateToken_1.hashToken)(csrfToken);
        admin.csrfToken = hashedCsrf;
        //Access and Refresh Token Handling
        const payload = { id: admin.id, role: admin.role };
        const accessToken = jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
        const refreshToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedRefresh = (0, generateToken_1.hashToken)(refreshToken);
        admin.refreshToken = hashedRefresh;
        admin.refreshTokenExpiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await admin_repository_1.adminRepository.save(admin);
        const safeData = this.sanitizeAdmin(admin);
        return { accessToken, refreshToken, safeData, csrfToken };
    },
    async logoutAdmin(id) {
        (0, CheckId_1.default)(id);
        const admin = await admin_repository_1.adminRepository.findById(id);
        if (!admin)
            throw new AppError_1.default("Admin not found or deleted", 404);
        admin.refreshToken = null;
        await admin_repository_1.adminRepository.save(admin);
        return;
    },
    async updateStatus(id, status) {
        (0, CheckId_1.default)(id);
        const updated = await admin_repository_1.adminRepository.update(id, { status });
        if (!updated)
            throw new AppError_1.default("Error updating the Admin status", 400);
        const sanitizedData = this.sanitizeAdmin(updated);
        await redis_config_1.redisClient.del(`admin:${id}`);
        return sanitizedData;
    },
    async softDelete(id) {
        (0, CheckId_1.default)(id);
        const deleted = await admin_repository_1.adminRepository.softDelete(id);
        if (!deleted)
            throw new AppError_1.default("Error Deleting Admin", 400);
        const sanitizedAdmin = this.sanitizeAdmin(deleted);
        await redis_config_1.redisClient.del(`admin:${id}`);
        return sanitizedAdmin;
    },
    async postRefresh(admin) {
        //CSRF Handler
        const csrfToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedCsrf = (0, generateToken_1.hashToken)(csrfToken);
        //Access and Refresh Handler
        let payload = { id: admin.id, role: admin.role };
        const accessToken = jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
        const refreshToken = (0, generateToken_1.generateToken)({ length: 32 });
        const hashedRefresh = (0, generateToken_1.hashToken)(refreshToken);
        const refreshTokenExpiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await admin_repository_1.adminRepository.update(admin.id, {
            refreshToken: hashedRefresh,
            refreshTokenExpiryAt,
            csrfToken: hashedCsrf,
        });
        return { accessToken, refreshToken, csrfToken };
    },
    async changePassword(id, currentPassword, newPassword) {
        const admin = await admin_repository_1.adminRepository.getPasswordById(id);
        if (!admin)
            throw new AppError_1.default("Admin not found", 400);
        const isMatch = await bcrypt_1.default.compare(currentPassword, admin.password);
        if (!isMatch) {
            throw new AppError_1.default("Invalid current password", 400);
        }
        const isSameAsOld = await bcrypt_1.default.compare(newPassword, admin.password);
        if (isSameAsOld) {
            throw new AppError_1.default("New password cannot be same as old password", 400);
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        const updatedAdmin = await admin_repository_1.adminRepository.update(id, {
            password: hashed,
            refreshToken: null,
            csrfToken: null,
            lockUntil: null,
            failedLoginAttempt: 0,
            lastLogin: new Date(),
        });
        const sanitized = this.sanitizeAdmin(updatedAdmin);
        return sanitized;
    },
};
