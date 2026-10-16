"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToolSuccess = formatToolSuccess;
exports.formatToolError = formatToolError;
exports.formatResourceSuccess = formatResourceSuccess;
exports.formatResourceError = formatResourceError;
const AppError_1 = __importDefault(require("../../utils/AppError"));
// ─── Tool formatters ──────────────────────────────────────────────────────────
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
// ─── Resource formatters ──────────────────────────────────────────────────────
/**
 * Wraps a successful resource payload in the MCP resource content envelope.
 *
 * @param uri       - The canonical URI of the resource (echoed back in the response)
 * @param data      - Any serialisable data to embed as JSON
 * @param statusCode - Logical HTTP-style status (default 200)
 */
function formatResourceSuccess(uri, data, statusCode = 200) {
    const payload = { success: true, statusCode, data };
    return {
        contents: [
            {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(payload, null, 2),
            },
        ],
    };
}
/**
 * Wraps an error in the MCP resource content envelope.
 * Resources do NOT have an `isError` flag – errors are surfaced via the payload.
 */
function formatResourceError(uri, err) {
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
        contents: [
            {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(payload, null, 2),
            },
        ],
    };
}
