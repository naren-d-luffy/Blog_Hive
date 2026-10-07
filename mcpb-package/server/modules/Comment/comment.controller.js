"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentController = void 0;
const comment_service_1 = require("./comment.service");
const toString_1 = require("../../utils/toString");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const parseCursor_1 = __importDefault(require("../../utils/Cursor/parseCursor"));
exports.commentController = {
    createComment: (0, asyncHandler_1.default)(async (req, res) => {
        const blogId = (0, toString_1.str)(req.params.blogId);
        const userId = (0, toString_1.str)(req.user?.id);
        const { content, parentCommentId } = req.body;
        const result = await comment_service_1.commentService.createComment(blogId, userId, content, parentCommentId);
        res.status(201).json({
            success: true,
            message: "Comment created successfully",
            data: result,
        });
    }),
    getComments: (0, asyncHandler_1.default)(async (req, res) => {
        const blogId = (0, toString_1.str)(req.params.blogId);
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await comment_service_1.commentService.getComments(blogId, cursor, limit);
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
    getReplies: (0, asyncHandler_1.default)(async (req, res) => {
        const commentId = (0, toString_1.str)(req.params.commentId);
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await comment_service_1.commentService.getReplies(commentId, cursor, limit);
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
    updateComment: (0, asyncHandler_1.default)(async (req, res) => {
        const commentId = (0, toString_1.str)(req.params.commentId);
        const userId = (0, toString_1.str)(req.user?.id);
        const { content } = req.body;
        const result = await comment_service_1.commentService.updateComment(commentId, userId, content);
        res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            data: result,
        });
    }),
    deleteComment: (0, asyncHandler_1.default)(async (req, res) => {
        const commentId = (0, toString_1.str)(req.params.commentId);
        const userId = (0, toString_1.str)(req.user?.id);
        const result = await comment_service_1.commentService.deleteComment(commentId, userId);
        res.status(200).json({
            success: true,
            message: "Comment deleted successfully",
            data: result,
        });
    }),
    likeComment: (0, asyncHandler_1.default)(async (req, res) => {
        const commentId = (0, toString_1.str)(req.params.commentId);
        const result = await comment_service_1.commentService.likeComment(commentId);
        res.status(200).json({
            success: true,
            message: "Comment liked",
            data: result,
        });
    }),
    unlikeComment: (0, asyncHandler_1.default)(async (req, res) => {
        const commentId = (0, toString_1.str)(req.params.commentId);
        const result = await comment_service_1.commentService.unlikeComment(commentId);
        res.status(200).json({
            success: true,
            message: "Comment unliked",
            data: result,
        });
    }),
    reportComment: (0, asyncHandler_1.default)(async (req, res) => {
        const commentId = (0, toString_1.str)(req.params.commentId);
        const result = await comment_service_1.commentService.reportComment(commentId);
        res.status(200).json({
            success: true,
            message: "Comment reported",
            data: result,
        });
    }),
};
