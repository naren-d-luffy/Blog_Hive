import mongoose, { Schema } from "mongoose";
import { IComment } from "./comment.interface";

const commentSchema = new Schema<IComment> (
    {
        blogId: {type: Schema.Types.ObjectId, ref:"Blogs", required:true},
        content: {type:String, required:true },
        
        createdBy: {type: Schema.Types.ObjectId,ref: "User",required: true},
        updatedBy: {type: Schema.Types.ObjectId,ref: "User",},
        
        parentCommentId: {type: Schema.Types.ObjectId, ref:"Comment", default: null},

        likeCount: { type: Number, default: 0, },
        replyCount: { type: Number, default: 0, },
        reportCount: { type: Number, default: 0, },

        isDeleted: {type:Boolean, default:false},
        deletedBy: {type:Schema.Types.ObjectId},
        deletedAt: {type:Date},
    },{timestamps:true}
)

commentSchema.index({ isDeleted: 1 });
commentSchema.index({ blogId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, createdAt: 1 });
commentSchema.index({ createdBy: 1 });

const Comment = mongoose.model<IComment>("Comment", commentSchema);
export default Comment;