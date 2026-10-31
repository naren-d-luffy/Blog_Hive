import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { tokenService } from "./token.service";
import { createTokenSchema } from "./token.validator";
import { Types } from "mongoose";
import { str } from "../../utils/toString";

export const tokenController = {
  createAdminInvite: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createTokenSchema.parse(req.body);

    const userId = req.user?.id;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const objectId = new Types.ObjectId(userId);
    const email = str(parsed.email);

    await tokenService.createAdminInvite(email, objectId);

    res.status(201).json({
      success: true,
      message: "Admin invite sent successfully",
    });
  }),
};