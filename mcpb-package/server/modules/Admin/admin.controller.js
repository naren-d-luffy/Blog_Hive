"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const admin_service_1 = require("./admin.service");
const admin_validator_1 = require("./admin.validator");
const env_config_1 = __importDefault(require("../../config/env.config"));
const AppError_1 = __importDefault(require("../../utils/AppError"));
const toString_1 = require("../../utils/toString");
const token_service_1 = require("../Token/token.service");
const token_validator_1 = require("../Token/token.validator");
const token_interface_1 = require("../Token/token.interface");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const parseCursor_1 = __importDefault(require("../../utils/Cursor/parseCursor"));
exports.adminController = {
    createAdmin: (0, asyncHandler_1.default)(async (req, res) => {
        const { token } = req.body;
        if (!token) {
            throw new AppError_1.default("Invite token is required", 400);
        }
        const type = token_interface_1.TokenType.ADMIN_INVITE;
        const isValid = await token_service_1.tokenService.verifyToken(token, type);
        if (!isValid) {
            throw new AppError_1.default("Invalid or expired invite token", 400);
        }
        const result = admin_validator_1.createAdminSchema.safeParse(req.body);
        if (!result.success) {
            return res
                .status(400)
                .json({ success: false, message: result.error.message });
        }
        const admin = await admin_service_1.adminService.createAdmin(result.data);
        await token_service_1.tokenService.markInviteAsUsed(token);
        await token_service_1.tokenService.invalidateAllByEmail(result.data.email);
        res.status(201).json({
            success: true,
            message: "Admin Created Successfully",
            data: admin,
        });
    }),
    getallAdmin: (0, asyncHandler_1.default)(async (req, res) => {
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await admin_service_1.adminService.findAllAdmin(cursor, limit);
        res.status(200).json({
            success: true,
            message: "Admins fetched successfully",
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            }
        });
    }),
    getCurrentAdmin: (0, asyncHandler_1.default)(async (req, res) => {
        const user = req.user;
        if (!user || user.role !== "admin") {
            throw new AppError_1.default("Unauthorized access", 401);
        }
        const fetchedAdmin = await admin_service_1.adminService.findAdminById(user.id);
        if (!fetchedAdmin) {
            throw new AppError_1.default("Admin not Found or Deleted", 404);
        }
        res.status(200).json({
            success: true,
            message: "Admin fetched successfully",
            data: fetchedAdmin,
        });
    }),
    login: (0, asyncHandler_1.default)(async (req, res) => {
        const result = admin_validator_1.adminLoginSchema.safeParse(req.body);
        if (!result.success) {
            return res
                .status(400)
                .json({ success: false, message: result.error.message });
        }
        const { accessToken, refreshToken, safeData, csrfToken } = await admin_service_1.adminService.loginAdmin(result.data);
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: env_config_1.default.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookie("csrfToken", csrfToken, {
            httpOnly: false,
            secure: env_config_1.default.NODE_ENV === "production",
            sameSite: "strict",
        });
        return res.status(202).json({
            success: true,
            data: safeData,
            access: accessToken,
        });
    }),
    logout: (0, asyncHandler_1.default)(async (req, res) => {
        const user = req.user;
        if (!user || user.role !== "admin") {
            throw new AppError_1.default("Unauthorized access", 401);
        }
        await admin_service_1.adminService.logoutAdmin(user.id);
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: env_config_1.default.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.clearCookie("csrfToken", {
            httpOnly: false,
            secure: env_config_1.default.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({
            success: true,
            message: "Logged out Successfully",
        });
    }),
    updateStatus: (0, asyncHandler_1.default)(async (req, res) => {
        const id = (0, toString_1.str)(req.params.id);
        const { status } = req.body;
        const updated = await admin_service_1.adminService.updateStatus(id, status);
        res.status(200).json({
            success: true,
            message: "Admin status updated successfully",
            data: updated,
        });
    }),
    softDelete: (0, asyncHandler_1.default)(async (req, res) => {
        const id = (0, toString_1.str)(req.params.id);
        const deleted = await admin_service_1.adminService.softDelete(id);
        res.status(200).json({
            success: true,
            message: "Admin deleted successfully",
            data: deleted,
        });
    }),
    refreshToken: (0, asyncHandler_1.default)(async (req, res) => {
        const adminDoc = req.authEntity;
        if (!adminDoc || adminDoc.role !== "admin") {
            throw new AppError_1.default("Forbidden", 403);
        }
        const { accessToken, refreshToken, csrfToken } = await admin_service_1.adminService.postRefresh({
            id: adminDoc._id.toString(),
            role: adminDoc.role,
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: env_config_1.default.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookie("csrfToken", csrfToken, {
            httpOnly: false,
            secure: env_config_1.default.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({
            success: true,
            message: "Tokens Refreshed Successfully",
            accessToken: accessToken,
        });
    }),
    changePassword: (0, asyncHandler_1.default)(async (req, res) => {
        const user = req.user;
        if (!user || user.role !== "admin") {
            throw new AppError_1.default("Unauthorized access", 401);
        }
        const result = admin_validator_1.changePasswordSchema.parse(req.body);
        const admin = await admin_service_1.adminService.changePassword(user.id, result.currentPassword, result.newPassword);
        res.status(200).json({
            success: true,
            message: "Password changed Successfully",
            data: admin,
        });
    }),
    forgotPassword: (0, asyncHandler_1.default)(async (req, res) => {
        const parsed = token_validator_1.forgotPasswordSchema.parse(req.body);
        await token_service_1.tokenService.forgotPassword(parsed.email);
        res.status(200).json({
            success: true,
            message: "If the email exists, a reset link has been sent",
        });
    }),
    resetPassword: (0, asyncHandler_1.default)(async (req, res) => {
        const parsed = admin_validator_1.resetPasswordSchema.parse(req.body);
        await token_service_1.tokenService.resetPassword(parsed.token, parsed.newPassword);
        res.status(200).json({
            success: true,
            message: "Password reset successful",
        });
    }),
};
