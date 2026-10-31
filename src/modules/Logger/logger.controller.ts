import { Request, Response } from "express";
import { loggerRepository } from "./logger.repository";
import { getLogsQuerySchema } from "./logger.validator";
import asyncHandler from "../../utils/asyncHandler";

export const loggerController = {
  getLogs: asyncHandler(async (req: Request, res: Response) => {
    // Validate Query params
    const query = getLogsQuerySchema.parse(req.query);

    // Fetch from Repository
    const result = await loggerRepository.findLogs(query);

    res.status(200).json({
      success: true,
      message: "Logs fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  }),
};
