"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerRepository = void 0;
const logger_model_1 = require("./logger.model");
class LoggerRepository {
    async findLogs(query) {
        const { page, limit, level, service, startDate, endDate, keyword } = query;
        const filter = {};
        if (level)
            filter.level = level;
        if (service)
            filter.service = service;
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate)
                filter.timestamp.$gte = startDate;
            if (endDate)
                filter.timestamp.$lte = endDate;
        }
        if (keyword) {
            filter.$or = [
                { "request.endpoint": { $regex: keyword, $options: "i" } },
                { "error.message": { $regex: keyword, $options: "i" } },
                { "metadata.message": { $regex: keyword, $options: "i" } },
                { "request.requestId": keyword },
            ];
        }
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            logger_model_1.LogModel.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            logger_model_1.LogModel.countDocuments(filter),
        ]);
        return {
            success: true,
            data: logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
exports.loggerRepository = new LoggerRepository();
