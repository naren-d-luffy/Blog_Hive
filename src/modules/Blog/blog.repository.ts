import { IBlog } from "./blog.interface";
import Blog from "./blog.model";
import type { Cursor } from "../../types/cursor.types";

export const blogRepository = {
  create(data: Partial<IBlog>) {
    return Blog.create(data);
  },

  findById(id: string) {
    return Blog.findOne({ _id: id, isDeleted: false });
  },

  findBySlug(slug: string) {
    return Blog.findOne({ slug, isDeleted: false });
  },

  findAll(cursor: Cursor | undefined, limit: number) {
    const filter: any = { isDeleted: false, status: "published" };

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

    return Blog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  findByCategory(category: string, cursor: Cursor | undefined, limit: number) {
    const filter: any = {
      isDeleted: false,
      status: "published",
      category,
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

    return Blog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  findByTag(tag: string, cursor: Cursor | undefined, limit: number) {
    const filter: any = {
      isDeleted: false,
      status: "published",
      tags: tag,
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

    return Blog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  findAllByPopularity(cursor: Cursor | undefined, limit: number) {
    const filter: any = { isDeleted: false, status: "published" };

    if (cursor && typeof cursor.popularityScore === "number") {
      filter.$or = [
        {
          popularityScore: { $lt: cursor.popularityScore },
        },
        {
          popularityScore: cursor.popularityScore,
          createdAt: { $lt: new Date(cursor.createdAt) },
        },
        {
          popularityScore: cursor.popularityScore,
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id },
        },
      ];
    } else if (cursor) {
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

    return Blog.find(filter)
      .sort({ popularityScore: -1, createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  findByAuthor(userId: string, cursor: Cursor | undefined, limit: number) {
    const filter: any = { createdBy: userId, isDeleted: false };

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

    return Blog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  findBySlugByRegex(regex: RegExp, excludedId?: string) {
    return Blog.find(
      {
        slug: regex,
        isDeleted: false,
        ...(excludedId && { _id: { $ne: excludedId } }),
      },
      { slug: 1 },
    ).lean();
  },

  search(query: string, skip: number, limit: number) {
    return Blog.find(
      { isDeleted: false, status: "published", $text: { $search: query } },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  update(id: string, data: Partial<IBlog>) {
    return Blog.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
      returnDocument: "after",
      runValidators: true,
    });
  },

  updatePopularityScore(id: string, score: number) {
    return Blog.updateOne(
      { _id: id, isDeleted: false },
      { $set: { popularityScore: score } },
    );
  },

  addComment(blogId: string, commentId: string) {
    return Blog.updateOne(
      { _id: blogId, isDeleted: false },
      { $addToSet: { comments: commentId }, $inc: { commentCount: 1 } },
    );
  },

  removeComment(blogId: string, commentId: string) {
    return Blog.updateOne(
      { _id: blogId, isDeleted: false },
      { $pull: { comments: commentId }, $inc: { commentCount: -1 } },
    );
  },

  softDelete(id: string, userId: string, actorModel: "User" | "Admin") {
    return Blog.findOneAndUpdate(
      {_id:id},
      {
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: userId,
        deletedByModel: actorModel,
      },
      { returnDocument: "after" },
    );
  },

  incrementView(id: string) {
    return Blog.updateOne(
      { _id: id, isDeleted: false },
      { $inc: { views: 1 } },
    );
  },

  incrementLike(id: string, userId: string) {
    return Blog.updateOne(
      { _id: id, isDeleted: false, likes: { $ne: userId } },
      { $addToSet: { likes: userId }, $inc: { likeCount: 1 } },
    );
  },

  decrementLikes(id: string, userId: string) {
    return Blog.updateOne(
      { _id: id, isDeleted: false, likes: userId, likeCount: { $gt: 0 } },
      {
        $pull: { likes: userId },
        $inc: { likeCount: -1 },
      },
    );
  },

  incrementReport(blogId: string) {
    return Blog.updateOne(
      { _id: blogId, isDeleted: false },
      { $inc: { reportCount: 1 } },
    );
  },

  bulkIncrementViews(ids: string[]) {
    return Blog.bulkWrite(
      ids.map((id) => ({
        updateOne: {
          filter: { _id: id, isDeleted: false },
          update: { $inc: { views: 1 } },
        },
      })),
    );
  },
};
