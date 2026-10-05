import { Request, Response, NextFunction } from "express";
import { commentService } from "./comment.service";
import { str } from "../../utils/toString";
import asyncHandler from "../../utils/asyncHandler";
import parseCursorPagination from "../../utils/Cursor/parseCursor";

export const commentController = {
  createComment: asyncHandler (async (req: Request, res: Response) => {
      const blogId = str(req.params.blogId);
      const userId = str(req.user?.id);

      const { content, parentCommentId } = req.body;

      const result = await commentService.createComment(
        blogId,
        userId,
        content,
        parentCommentId,
      );

      res.status(201).json({
        success: true,
        message: "Comment created successfully",
        data: result,
      });
  }),

  getComments: asyncHandler (async (req: Request, res: Response) => {
      const blogId = str(req.params.blogId);
      const { cursor, limit } = parseCursorPagination(req.query);

      const result = await commentService.getComments(blogId, cursor, limit);

      res.status(200).json({
        success: true,
        message: "Comments fetched successfully",
        data: result.sanitizedData,
        pagination: {
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          nextCursor: result.nextCursor,
        },
      });
  }),

  getReplies: asyncHandler (async (req: Request, res: Response) => {
      const commentId = str(req.params.commentId);
      const { cursor, limit } = parseCursorPagination(req.query);

      const result = await commentService.getReplies(commentId, cursor, limit);

      res.status(200).json({
        success: true,
        message: "Replies fetched successfully",
        data: result.sanitizedData,
        pagination: {
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          nextCursor: result.nextCursor,
        },
      });
  }),

  updateComment: asyncHandler (async (req: Request, res: Response) => {
      const commentId = str(req.params.commentId);
      const userId = str(req.user?.id);

      const { content } = req.body;

      const result = await commentService.updateComment(
        commentId,
        userId,
        content,
      );

      res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        data: result,
      });
  }),

  deleteComment: asyncHandler (async (req: Request, res: Response) => {
      const commentId = str(req.params.commentId);
      const userId = str(req.user?.id);

      const result = await commentService.deleteComment(commentId, userId);

      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
        data: result,
      });
  }),

  likeComment: asyncHandler (async (req: Request, res: Response) => {
      const commentId = str(req.params.commentId);

      const result = await commentService.likeComment(commentId);

      res.status(200).json({
        success: true,
        message: "Comment liked",
        data: result,
      });
  }),

  unlikeComment: asyncHandler (async (req: Request, res: Response) => {
      const commentId = str(req.params.commentId);

      const result = await commentService.unlikeComment(commentId);

      res.status(200).json({
        success: true,
        message: "Comment unliked",
        data: result,
      });
  }),

  reportComment: asyncHandler (async (req: Request, res: Response) => {
      const commentId = str(req.params.commentId);

      const result = await commentService.reportComment(commentId);

      res.status(200).json({
        success: true,
        message: "Comment reported",
        data: result,
      });
  }),
};
