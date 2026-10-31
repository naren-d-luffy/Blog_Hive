import { Document, Types } from "mongoose";

export interface IBlog extends Document {
    heading: string,
    content: string,
    createdBy: Types.ObjectId,
    updatedBy:Types.ObjectId,

    tags: string[],
    category: string[],
    status: 'draft' | 'published' | 'archived',
    slug: string,
    
    views: number,
    likes: Types.ObjectId[],
    likeCount : number,
    comments: Types.ObjectId[],
    commentCount: number,
    popularityScore: number,
    
    isDeleted: boolean,
    deletedBy: Types.ObjectId,
    deletedByModel: string,
    deletedAt: Date,
    
    reportCount: number,
    
    createdAt: Date,
    updatedAt: Date,
}