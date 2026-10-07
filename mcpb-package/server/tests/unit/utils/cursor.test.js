"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cursor_1 = require("../../../utils/Cursor/cursor");
const AppError_1 = __importDefault(require("../../../utils/AppError"));
describe("Cursor encode and decode", () => {
    it("should encode and decode a valid cursor with createdAt and id", () => {
        const cursorObj = {
            createdAt: "2026-10-03T10:00:00.000Z",
            id: "6703cc226a27e029c9ef6bc1",
        };
        const encoded = (0, cursor_1.encodeCursor)(cursorObj);
        expect(typeof encoded).toBe("string");
        const decoded = (0, cursor_1.decodeCursor)(encoded);
        expect(decoded).toEqual(cursorObj);
    });
    it("should encode and decode cursor with popularityScore", () => {
        const cursorObj = {
            createdAt: "2026-10-03T10:00:00.000Z",
            id: "6703cc226a27e029c9ef6bc1",
            popularityScore: 42.5,
        };
        const encoded = (0, cursor_1.encodeCursor)(cursorObj);
        const decoded = (0, cursor_1.decodeCursor)(encoded);
        expect(decoded).toEqual(cursorObj);
    });
    it("should throw AppError when decoding invalid base64", () => {
        expect(() => (0, cursor_1.decodeCursor)("invalid-base64-string!@#$")).toThrow(AppError_1.default);
    });
    it("should throw AppError when cursor is missing createdAt or id", () => {
        const missingId = Buffer.from(JSON.stringify({ createdAt: "2026-10-03T10:00:00.000Z" })).toString("base64");
        expect(() => (0, cursor_1.decodeCursor)(missingId)).toThrow(AppError_1.default);
        const missingCreatedAt = Buffer.from(JSON.stringify({ id: "123" })).toString("base64");
        expect(() => (0, cursor_1.decodeCursor)(missingCreatedAt)).toThrow(AppError_1.default);
    });
    it("should throw AppError when createdAt is not a valid date string", () => {
        const invalidDate = Buffer.from(JSON.stringify({ createdAt: "not-a-date", id: "123" })).toString("base64");
        expect(() => (0, cursor_1.decodeCursor)(invalidDate)).toThrow(AppError_1.default);
    });
});
