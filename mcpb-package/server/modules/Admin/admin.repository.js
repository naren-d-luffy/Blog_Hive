"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRepository = void 0;
const admin_model_1 = __importDefault(require("./admin.model"));
exports.adminRepository = {
    create(data) {
        return admin_model_1.default.create(data);
    },
    findById(id) {
        return admin_model_1.default.findById(id);
    },
    getSessionById(id) {
        return admin_model_1.default.findOne({ _id: id, isDeleted: false }).select("+csrfToken +refreshToken +refreshTokenExpiryAt");
    },
    getSessionByRefreshToken(refreshToken) {
        return admin_model_1.default.findOne({ refreshToken, isDeleted: false }).select("+csrfToken +refreshToken +refreshTokenExpiryAt");
    },
    getPasswordById(id) {
        return admin_model_1.default.findOne({ _id: id, isDeleted: false }).select("+password");
    },
    findByEmailWithPassword(email) {
        return admin_model_1.default.findOne({ email, isDeleted: false }).select("+password");
    },
    findByEmail(email) {
        return admin_model_1.default.findOne({ email, isDeleted: false });
    },
    findAll(cursor = null, limit) {
        const filter = { isdeleted: false };
        if (cursor) {
            filter.$or = [
                {
                    createdAt: {
                        $lt: new Date(cursor.createdAt),
                    }
                },
                {
                    createdAt: new Date(cursor.createdAt),
                    _id: { $lt: cursor.id }
                }
            ];
        }
        return admin_model_1.default.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit);
    },
    update(id, data) {
        return admin_model_1.default.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
            returnDocument: "after",
            runValidators: true,
        });
    },
    softDelete(id) {
        return admin_model_1.default.findOneAndUpdate({ _id: id }, { isDeleted: true, deletedDate: new Date() }, { returnDocument: "after" });
    },
    save(admin) {
        return admin.save();
    },
};
