"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const AppError_1 = __importDefault(require("../../../utils/AppError"));
const CheckId_1 = __importDefault(require("../../../utils/CheckId"));
describe("checkId", () => {
    it("should not throw for valid ObjectId", () => {
        const id = new mongoose_1.default.Types.ObjectId().toString();
        expect(() => (0, CheckId_1.default)(id)).not.toThrow();
    });
    it("should throw AppError for invalid id", () => {
        expect(() => (0, CheckId_1.default)("abc123")).toThrow(AppError_1.default);
    });
    it("should throw correct message", () => {
        expect(() => (0, CheckId_1.default)("invalid")).toThrow("Invalid Id");
    });
    it("should throw for empty string", () => {
        expect(() => (0, CheckId_1.default)("")).toThrow(AppError_1.default);
    });
});
