"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenRepository = void 0;
const token_model_1 = __importDefault(require("./token.model"));
exports.tokenRepository = {
    async create(tokenData) {
        return token_model_1.default.create(tokenData);
    },
    async getByToken(tokenHash, type) {
        return token_model_1.default.findOne({
            tokenHash,
            type,
            expiryAt: { $gt: new Date() },
            isUsed: false,
        });
    },
    async markAsUsed(tokenHash, type) {
        return token_model_1.default.updateOne({
            tokenHash,
            type,
            isUsed: false,
            expiryAt: { $gt: new Date() },
        }, {
            $set: { isUsed: true },
        });
    },
    async invalidateByEmail(email, type) {
        return token_model_1.default.updateMany({
            email,
            isUsed: false,
            ...(type && { type }),
        }, {
            $set: { isUsed: true },
        });
    },
    async invalidateByUser(userId, type) {
        return token_model_1.default.updateMany({
            user: userId,
            isUsed: false,
            ...(type && { type }),
        }, {
            $set: { isUsed: true },
        });
    },
};
