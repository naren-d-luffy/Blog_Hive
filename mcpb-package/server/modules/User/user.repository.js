"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_model_1 = __importDefault(require("./user.model"));
exports.userRepository = {
    create(data) {
        return user_model_1.default.create(data);
    },
    findById(id) {
        return user_model_1.default.findById(id);
    },
    getSessionById(id) {
        return user_model_1.default.findOne({ _id: id, isDeleted: false }).select("+csrfToken +refreshToken +refreshTokenExpiryAt");
    },
    getSessionByRefreshToken(refreshToken) {
        return user_model_1.default.findOne({ refreshToken, isDeleted: false }).select("+csrfToken +refreshToken +refreshTokenExpiryAt");
    },
    getPasswordById(id) {
        return user_model_1.default.findOne({ _id: id, isDeleted: false }).select("+password");
    },
    findByEmail(email) {
        return user_model_1.default.findOne({ email, isDeleted: false }).select("+password");
    },
    findAll(cursor, limit) {
        const filter = { isDeleted: false };
        if (cursor) {
            filter.$or = [
                {
                    createdAt: {
                        $lt: new Date(cursor.createdAt),
                    },
                },
                {
                    createdAt: new Date(cursor.createdAt),
                    _id: { $lt: cursor.id },
                },
            ];
        }
        return user_model_1.default.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit);
    },
    update(id, data) {
        return user_model_1.default.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
            returnDocument: "after",
            runValidators: true,
        });
    },
    softDelete(id) {
        return user_model_1.default.findOneAndUpdate({ _id: id }, { isDeleted: true, deletedDate: new Date() }, { returnDocument: "after" });
    },
    save(user) {
        return user.save();
    },
};
