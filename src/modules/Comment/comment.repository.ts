import { Types } from "mongoose";
import { IComment } from "./comment.interface";
import Comment from "./comment.model";

const commentRepository = {
  async createComment(commentData: Partial<IComment>) {
    return Comment.create(commentData);
  },

  async getAllComments(blogId: string, skip = 0, limit = 10) {
    return Comment.find({
      blogId: new Types.ObjectId(blogId),
      parentCommentId: null,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  async getReplies(commentId: string, skip = 0, limit = 10) {
    return Comment.find({
      parentCommentId: new Types.ObjectId(commentId),
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .skip(skip)
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
