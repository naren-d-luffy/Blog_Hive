"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../../utils/AppError"));
describe("AppError", () => {
    it("should create an AppError with the correct properties", () => {
        const error = new AppError_1.default("Something went wrong", 400);
        expect(error).toBeInstanceOf(AppError_1.default);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Something went wrong");
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
    });
    it("should store additional error details", () => {
        const details = {
            field: "email",
            reason: "Already exists",
        };
        const error = new AppError_1.default("Validation failed", 409, details);
        expect(error.details).toEqual(details);
    });
    it("should contain a stack trace", () => {
        const error = new AppError_1.default("Internal Server Error", 500);
        expect(error.stack).toBeDefined();
    });
});
