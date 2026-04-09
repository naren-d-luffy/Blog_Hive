import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { adminInviteService } from "./adminInvite.service";
import { createAdminInviteSchema } from "./adminInvite.validator";
import { Types } from "mongoose";

export const adminInviteController = {
  createAdminInvite: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createAdminInviteSchema.parse(req.body);
    const userId = req.user?.id;

    const objectId = new Types.ObjectId(userId);

    await adminInviteService.createAdminInvite(parsed.email, objectId);

    res.status(201).json({
      success: true,
      message: "Admin invite sent successfully",
    });
  }),
};
