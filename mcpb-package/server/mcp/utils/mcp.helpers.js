"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToolSuccess = formatToolSuccess;
exports.formatToolError = formatToolError;
const AppError_1 = __importDefault(require("../../utils/AppError"));
// ─── Formatters ───────────────────────────────────────────────────────────────
function formatToolSuccess(data, statusCode = 200) {
    const payload = {
        success: true,
        statusCode,
        data,
    };
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(payload, null, 2),
            },
        ],
    };
}
function formatToolError(err) {
    let statusCode = 500;
    let message = "An unexpected internal server error occurred";
    let details;
    if (err instanceof AppError_1.default) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    }
    else if (err instanceof Error) {
        message = err.message;
    }
    const payload = {
        success: false,
        statusCode,
        error: message,
        ...(details !== undefined && { details }),
    };
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(payload, null, 2),
            },
        ],
        isError: true,
    };
}
