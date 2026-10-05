import { Types } from "mongoose";
import { IComment } from "./comment.interface";
import Comment from "./comment.model";
import type { Cursor } from "../../types/cursor.types";

const commentRepository = {
  async createComment(commentData: Partial<IComment>) {
    return Comment.create(commentData);
  },

  async getAllComments(
    blogId: string,
    cursor: Cursor | undefined,
    limit: number,
  ) {
    const filter: any = {
      blogId: new Types.ObjectId(blogId),
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

    return Comment.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  async getReplies(
    commentId: string,
    cursor: Cursor | undefined,
    limit: number,
  ) {
    const filter: any = {
      parentCommentId: new Types.ObjectId(commentId),
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

    return Comment.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .lean();
  },

  async getCommentById(commentId: string) {
    return Comment.findOne({
      _id: new Types.ObjectId(commentId),
      isDeleted: false,
    }).lean();
  },

  async updateComment(commentId: string, updateData: Partial<IComment>) {
    return Comment.findOneAndUpdate(
      { _id: new Types.ObjectId(commentId), isDeleted: false },
      { $set: updateData },
      { new: true },
    );
  },

  async softDelete(commentId: string, deletedBy: string) {
    return Comment.findOneAndUpdate(
      { _id: new Types.ObjectId(commentId) },
      {
        $set: {
          isDeleted: true,
          deletedBy: new Types.ObjectId(deletedBy),
          deletedAt: new Date(),
        },
      },
      { new: true },
    );
  },

  async incrementReplyCount(commentId: string, value = 1) {
    return Comment.findOneAndUpdate(
      { _id: commentId, isDeleted: false },
      { $inc: { replyCount: value } },
      { new: true },
    );
  },

  async incrementLikeCount(commentId: string, value = 1) {
    return Comment.findOneAndUpdate(
      { _id: commentId, isDeleted: false },
      { $inc: { likeCount: value } },
      { new: true },
    );
  },

  async incrementReportCount(commentId: string, value = 1) {
    return Comment.findOneAndUpdate(
      {_id:commentId},
      { $inc: { reportCount: value } },
      { new: true },
    );
  },
};

export default commentRepository;
