"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_config_1 = __importDefault(require("../config/env.config"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const errorHandler = (err, req, res, next) => {
    res.locals.error = err; // Storing err for logger
    console.error("ERROR:", err);
    let statusCode = err instanceof AppError_1.default ? err.statusCode : 500;
    let message = err.message || "Internal Server Error";
    let errors = [];
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource ID";
    }
    if (err.code === 11000) {
        statusCode = 400;
        message = "Duplicate field value entered";
    }
    if (err.name === "ValidationError") {
        statusCode = 400;
        errors = Object.values(err.errors).map((val) => val.message);
        message = "Validation failed";
    }
    if (env_config_1.default.NODE_ENV === "production" && statusCode === 500) {
        message = "Something went wrong";
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors.length > 0 && { errors }),
        ...(env_config_1.default.NODE_ENV === "development" && {
            stack: err.stack,
            details: err instanceof AppError_1.default ? err.details : undefined,
        }),
    });
};
exports.default = errorHandler;
