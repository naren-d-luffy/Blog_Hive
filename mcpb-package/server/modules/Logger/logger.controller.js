"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerController = void 0;
const logger_repository_1 = require("./logger.repository");
const logger_validator_1 = require("./logger.validator");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
exports.loggerController = {
    getLogs: (0, asyncHandler_1.default)(async (req, res) => {
        // Validate Query params
        const query = logger_validator_1.getLogsQuerySchema.parse(req.query);
        // Fetch from Repository
        const result = await logger_repository_1.loggerRepository.findLogs(query);
        res.status(200).json({
            success: true,
            message: "Logs fetched successfully",
            data: result.data,
            pagination: result.pagination,
        });
    }),
};
