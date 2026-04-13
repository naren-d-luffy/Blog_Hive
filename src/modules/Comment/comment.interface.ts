import { Document, Types } from "mongoose";

export interface IComment extends Document {
  blogId: Types.ObjectId;

  content: string;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  parentCommentId?: Types.ObjectId;

  likeCount: number;
  replyCount: number;
  reportCount: number

  isDeleted: boolean;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date

  createdAt: Date;
  updatedAt: Date;
}