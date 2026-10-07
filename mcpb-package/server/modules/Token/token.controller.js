"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenController = void 0;
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const token_service_1 = require("./token.service");
const token_validator_1 = require("./token.validator");
const mongoose_1 = require("mongoose");
const toString_1 = require("../../utils/toString");
exports.tokenController = {
    createAdminInvite: (0, asyncHandler_1.default)(async (req, res) => {
        const parsed = token_validator_1.createTokenSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId || !mongoose_1.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const objectId = new mongoose_1.Types.ObjectId(userId);
        const email = (0, toString_1.str)(parsed.email);
        await token_service_1.tokenService.createAdminInvite(email, objectId);
        res.status(201).json({
            success: true,
            message: "Admin invite sent successfully",
        });
    }),
};
