import { IBlog } from "./blog.interface";
import Blog from "./blog.model";

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

  findAll(skip: number, limit: number) {
    return Blog.find({ isDeleted: false, status: "published" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  findByCategory(category: string, skip: number, limit: number) {
    return Blog.find({
      isDeleted: false,
      status: "published",
      category,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  findByTag(tag: string, skip: number, limit: number) {
    return Blog.find({
      isDeleted: false,
      status: "published",
      tags: tag,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  findAllByPolularity(skip: number, limit: number) {
    return Blog.find({ isDeleted: false, status: "published" })
      .sort({ popularityScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  findByAuthor(userId: string, skip: number, limit: number) {
    return Blog.find({ createdBy: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
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

  totalCount() {
    return Blog.countDocuments({ isDeleted: false, status: "published" });
  },

  countByCategory(category: string) {
    return Blog.countDocuments({
      isDeleted: false,
      status: "published",
      category,
    });
  },

  countByTag(tag: string) {
    return Blog.countDocuments({
      isDeleted: false,
      status: "published",
      tags: tag,
    });
  },

  countByAuthor(userId: string) {
    return Blog.countDocuments({
      createdBy: userId,
      isDeleted: false,
      status: "published",
    });
  },

  countSearch(query: string) {
    return Blog.countDocuments({
      isDeleted: false,
      status: "published",
      $text: { $search: query },
    });
  },

  update(id: string, data: Partial<IBlog>) {
    return Blog.findByIdAndUpdate({ _id: id, isDeleted: false }, data, {
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
      { $pull: { comments: commentId } },
    );
  },

  softDelete(id: string, userId: string, actorModel: "User" | "Admin") {
    return Blog.findByIdAndUpdate(
      id,
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
      { _id: id, isDeleted: false },
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
