"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("./user.service");
const user_validator_1 = require("./user.validator");
const env_config_1 = __importDefault(require("../../config/env.config"));
const AppError_1 = __importDefault(require("../../utils/AppError"));
const toString_1 = require("../../utils/toString");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const parseCursor_1 = __importDefault(require("../../utils/Cursor/parseCursor"));
exports.userController = {
    createuser: (0, asyncHandler_1.default)(async (req, res) => {
        const result = user_validator_1.createUserSchema.safeParse(req.body);
        if (!result.success) {
            return res
                .status(400)
                .json({ success: false, message: result.error.message });
        }
        const user = await user_service_1.userService.createUser(result.data);
        res.status(201).json({
            success: true,
            message: "user Created Successfully",
            data: user,
        });
    }),
    getalluser: (0, asyncHandler_1.default)(async (req, res) => {
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await user_service_1.userService.findAllUser(cursor, limit);
        res.status(200).json({
            success: true,
            message: "users fetched successfully",
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            }
        });
    }),
    getuserById: (0, asyncHandler_1.default)(async (req, res) => {
        const id = req.user?.id;
        if (!id) {
            throw new AppError_1.default("Id is required", 400);
        }
        const fetcheduser = await user_service_1.userService.findUserById(id);
        if (!fetcheduser) {
            throw new AppError_1.default("user not Found or Deleted", 404);
        }
        res.status(200).json({
            success: true,
            message: "user fetched successfully",
            data: fetcheduser,
        });
    }),
    login: (0, asyncHandler_1.default)(async (req, res) => {
        const result = user_validator_1.userLoginSchema.safeParse(req.body);
        if (!result.success) {
            return res
                .status(400)
                .json({ success: false, message: result.error.message });
        }
        const { accessToken, refreshToken, safeData, csrfToken } = await user_service_1.userService.loginUser(result.data);
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
        const id = req.user?.id;
        if (!id) {
            throw new AppError_1.default("Unauthorized", 401);
        }
        await user_service_1.userService.logoutUser(id);
        res.clearCookie("refreshToken", {
            httpOnly: true,
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
        const updated = await user_service_1.userService.updateStatus(id, status);
        res.status(200).json({
            success: true,
            message: "user status updated successfully",
            data: updated,
        });
    }),
    softDelete: (0, asyncHandler_1.default)(async (req, res) => {
        const id = (0, toString_1.str)(req.params.id);
        const deleted = await user_service_1.userService.softDelete(id);
        res.status(200).json({
            success: true,
            message: "user deleted successfully",
            data: deleted,
        });
    }),
    refreshToken: (0, asyncHandler_1.default)(async (req, res) => {
        const userDoc = req.authEntity;
        if (!userDoc || userDoc.role !== "user") {
            throw new AppError_1.default("Forbidden", 403);
        }
        const { accessToken, refreshToken, csrfToken } = await user_service_1.userService.postRefresh({
            id: userDoc._id.toString(),
            role: userDoc.role,
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
        const id = (0, toString_1.str)(req.user?.id);
        const result = user_validator_1.changePasswordSchema.parse(req.body);
        const user = await user_service_1.userService.changePassword(id, result.currentPassword, result.newPassword);
        res.status(200).json({
            success: true,
            message: "Password changed Successfully",
            data: user,
        });
    }),
    verifyUser: (0, asyncHandler_1.default)(async (req, res) => {
        const parsed = user_validator_1.verifyUserSchema.parse(req.body);
        if (!parsed.token)
            return res
                .status(401)
                .json({ success: false, message: "Token is required." });
        await user_service_1.userService.verifyUser(parsed.token);
        res.status(201).json({ success: true, message: "User Verified SuccessFully" });
    }),
};
