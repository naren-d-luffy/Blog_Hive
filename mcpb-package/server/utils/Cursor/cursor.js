"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeCursor = exports.encodeCursor = void 0;
const AppError_1 = __importDefault(require("../AppError"));
const encodeCursor = (cursor) => {
    return Buffer.from(JSON.stringify(cursor)).toString("base64");
};
exports.encodeCursor = encodeCursor;
const decodeCursor = (cursor) => {
    try {
        const decoded = Buffer.from(cursor, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (typeof parsed.createdAt !== "string" ||
            typeof parsed.id !== "string" ||
            !parsed.createdAt ||
            !parsed.id) {
            throw new AppError_1.default("Invalid Cursor", 400);
        }
        if (Number.isNaN(Date.parse(parsed.createdAt))) {
            throw new AppError_1.default("Invalid Cursor", 400);
        }
        return {
            createdAt: parsed.createdAt,
            id: parsed.id,
            ...(typeof parsed.popularityScore === "number" && {
                popularityScore: parsed.popularityScore,
            }),
        };
    }
    catch {
        throw new AppError_1.default("Invalid Cursor", 400);
    }
};
exports.decodeCursor = decodeCursor;
