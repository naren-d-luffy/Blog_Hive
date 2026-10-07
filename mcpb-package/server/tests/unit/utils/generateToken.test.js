"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generateToken_1 = require("../../../utils/generateToken");
const AppError_1 = __importDefault(require("../../../utils/AppError"));
describe("generateToken", () => {
    it("should generate a default token", () => {
        const token = (0, generateToken_1.generateToken)();
        expect(typeof token).toBe("string");
        expect(token.length).toBeGreaterThan(0);
    });
    it("should generate different tokens each time", () => {
        const token1 = (0, generateToken_1.generateToken)();
        const token2 = (0, generateToken_1.generateToken)();
        expect(token1).not.toBe(token2);
    });
    it("should generate hex encoded token", () => {
        const token = (0, generateToken_1.generateToken)({
            length: 16,
            encoding: "hex",
        });
        expect(token).toMatch(/^[a-f0-9]+$/);
        expect(token.length).toBe(32);
    });
    it("should generate base64url token", () => {
        const token = (0, generateToken_1.generateToken)({
            length: 16,
            encoding: "base64url",
        });
        expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
    it("should prepend prefix", () => {
        const token = (0, generateToken_1.generateToken)({
            prefix: "verify_",
        });
        expect(token.startsWith("verify_")).toBe(true);
    });
    it("should throw when length <= 0", () => {
        expect(() => (0, generateToken_1.generateToken)({ length: 0 })).toThrow(AppError_1.default);
        expect(() => (0, generateToken_1.generateToken)({ length: -5 })).toThrow("Token Length must be greater than 0");
    });
});
