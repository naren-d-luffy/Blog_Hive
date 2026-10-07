"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const comment_model_1 = __importDefault(require("./comment.model"));
const commentRepository = {
    async createComment(commentData) {
        return comment_model_1.default.create(commentData);
    },
    async getAllComments(blogId, cursor, limit) {
        const filter = {
            blogId: new mongoose_1.Types.ObjectId(blogId),
            parentCommentId: null,
            isDeleted: false,
        };
        if (cursor) {
            filter.$or = [
                {
                    createdAt: {
                        $lt: new Date(cursor.createdAt),
                    },
                },
                {
                    createdAt: new Date(cursor.createdAt),
                    _id: { $lt: cursor.id },
                },
            ];
        }
        return comment_model_1.default.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();
    },
    async getReplies(commentId, cursor, limit) {
        const filter = {
            parentCommentId: new mongoose_1.Types.ObjectId(commentId),
            isDeleted: false,
        };
        if (cursor) {
            filter.$or = [
                {
                    createdAt: {
                        $gt: new Date(cursor.createdAt),
                    },
                },
                {
                    createdAt: new Date(cursor.createdAt),
                    _id: { $gt: cursor.id },
                },
            ];
        }
        return comment_model_1.default.find(filter)
            .sort({ createdAt: 1, _id: 1 })
            .limit(limit)
            .lean();
    },
    async getCommentById(commentId) {
        return comment_model_1.default.findOne({
            _id: new mongoose_1.Types.ObjectId(commentId),
            isDeleted: false,
        }).lean();
    },
    async updateComment(commentId, updateData) {
        return comment_model_1.default.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(commentId), isDeleted: false }, { $set: updateData }, { new: true });
    },
    async softDelete(commentId, deletedBy) {
        return comment_model_1.default.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(commentId) }, {
            $set: {
                isDeleted: true,
                deletedBy: new mongoose_1.Types.ObjectId(deletedBy),
                deletedAt: new Date(),
            },
        }, { new: true });
    },
    async incrementReplyCount(commentId, value = 1) {
        return comment_model_1.default.findOneAndUpdate({ _id: commentId, isDeleted: false }, { $inc: { replyCount: value } }, { new: true });
    },
    async incrementLikeCount(commentId, value = 1) {
        return comment_model_1.default.findOneAndUpdate({ _id: commentId, isDeleted: false }, { $inc: { likeCount: value } }, { new: true });
    },
    async incrementReportCount(commentId, value = 1) {
        return comment_model_1.default.findOneAndUpdate({ _id: commentId }, { $inc: { reportCount: value } }, { new: true });
    },
};
exports.default = commentRepository;
