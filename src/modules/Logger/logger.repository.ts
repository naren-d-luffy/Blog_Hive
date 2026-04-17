import { LogModel } from "./logger.model";
import { z } from "zod";
import { getLogsQuerySchema } from "./logger.validator";

type GetLogsQuery = z.infer<typeof getLogsQuerySchema>;

class LoggerRepository {
  async findLogs(query: GetLogsQuery) {
    const { page, limit, level, service, startDate, endDate, keyword } = query;
    const filter: any = {};

    if (level) filter.level = level;
    if (service) filter.service = service;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
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
      LogModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LogModel.countDocuments(filter),
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

export const loggerRepository = new LoggerRepository();
