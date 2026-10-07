"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const AppError_1 = __importDefault(require("./AppError"));
const checkId = (id) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new AppError_1.default("Invalid Id", 400);
    }
};
exports.default = checkId;
