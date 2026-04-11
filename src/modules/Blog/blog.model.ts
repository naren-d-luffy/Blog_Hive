import mongoose, { Schema } from "mongoose";
import { IBlog } from "./blog.interface";

const blogSchema = new Schema<IBlog>(
  {
    heading: {type: String,required: true, trim: true,},
    content: {type: String,required: true },
    createdBy: {type: Schema.Types.ObjectId,ref: "User",required: true},
    updatedBy: {type: Schema.Types.ObjectId,ref: "User",},

    tags: [{type: String,},],
    category: [ { type: String, },],
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft",},
    slug: { type: String, unique: true, required: true,},

    views: { type: Number, default: 0,},
    likes: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], select: false },
    likeCount: { type: Number, default: 0, },
    comments: { type: [{ type: Schema.Types.ObjectId, ref: "Comment" }], select: false },
    commentCount : {type: Number, default:0},
    popularityScore : {type: Number, default:0},

    isDeleted: { type: Boolean, default: false,  },
    deletedBy: {type: Schema.Types.ObjectId,refPath: "deletedByModel", index: { sparse: true }},
    deletedByModel: {type:String, enum:["User", "Admin"]},
    deletedAt: { type: Date, index: { sparse: true }},
    reportCount: { type: Number, default: 0,},
  },
  {timestamps: true,}
);

blogSchema.index({ isDeleted: 1, createdAt: -1 });
blogSchema.index({ isDeleted: 1, category: 1 }); 
blogSchema.index({ isDeleted: 1, tags: 1 });
blogSchema.index({ isDeleted: 1, popularityScore: -1, createdAt: -1 });
blogSchema.index({ isDeleted: 1, heading: "text", content: "text" }, {weights: {heading:2, content:1}});
blogSchema.index({ isDeleted: 1, status: 1 });

const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;