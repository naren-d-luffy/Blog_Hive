"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogRepository = void 0;
const blog_model_1 = __importDefault(require("./blog.model"));
exports.blogRepository = {
    create(data) {
        return blog_model_1.default.create(data);
    },
    findById(id) {
        return blog_model_1.default.findOne({ _id: id, isDeleted: false });
    },
    findBySlug(slug) {
        return blog_model_1.default.findOne({ slug, isDeleted: false });
    },
    findAll(cursor, limit) {
        const filter = { isDeleted: false, status: "published" };
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
        return blog_model_1.default.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();
    },
    findByCategory(category, cursor, limit) {
        const filter = {
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
        return blog_model_1.default.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();
    },
    findByTag(tag, cursor, limit) {
        const filter = {
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
        return blog_model_1.default.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();
    },
    findAllByPopularity(cursor, limit) {
        const filter = { isDeleted: false, status: "published" };
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
        }
        else if (cursor) {
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
        return blog_model_1.default.find(filter)
            .sort({ popularityScore: -1, createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();
    },
    findByAuthor(userId, cursor, limit) {
        const filter = { createdBy: userId, isDeleted: false };
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
        return blog_model_1.default.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();
    },
    findBySlugByRegex(regex, excludedId) {
        return blog_model_1.default.find({
            slug: regex,
            isDeleted: false,
            ...(excludedId && { _id: { $ne: excludedId } }),
        }, { slug: 1 }).lean();
    },
    search(query, skip, limit) {
        return blog_model_1.default.find({ isDeleted: false, status: "published", $text: { $search: query } }, { score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } })
            .skip(skip)
            .limit(limit)
            .lean();
    },
    update(id, data) {
        return blog_model_1.default.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
            returnDocument: "after",
            runValidators: true,
        });
    },
    updatePopularityScore(id, score) {
        return blog_model_1.default.updateOne({ _id: id, isDeleted: false }, { $set: { popularityScore: score } });
    },
    addComment(blogId, commentId) {
        return blog_model_1.default.updateOne({ _id: blogId, isDeleted: false }, { $addToSet: { comments: commentId }, $inc: { commentCount: 1 } });
    },
    removeComment(blogId, commentId) {
        return blog_model_1.default.updateOne({ _id: blogId, isDeleted: false }, { $pull: { comments: commentId }, $inc: { commentCount: -1 } });
    },
    softDelete(id, userId, actorModel) {
        return blog_model_1.default.findOneAndUpdate({ _id: id }, {
            isDeleted: true,
            deletedAt: Date.now(),
            deletedBy: userId,
            deletedByModel: actorModel,
        }, { returnDocument: "after" });
    },
    incrementView(id) {
        return blog_model_1.default.updateOne({ _id: id, isDeleted: false }, { $inc: { views: 1 } });
    },
    incrementLike(id, userId) {
        return blog_model_1.default.updateOne({ _id: id, isDeleted: false, likes: { $ne: userId } }, { $addToSet: { likes: userId }, $inc: { likeCount: 1 } });
    },
    decrementLikes(id, userId) {
        return blog_model_1.default.updateOne({ _id: id, isDeleted: false, likes: userId, likeCount: { $gt: 0 } }, {
            $pull: { likes: userId },
            $inc: { likeCount: -1 },
        });
    },
    incrementReport(blogId) {
        return blog_model_1.default.updateOne({ _id: blogId, isDeleted: false }, { $inc: { reportCount: 1 } });
    },
    bulkIncrementViews(ids) {
        return blog_model_1.default.bulkWrite(ids.map((id) => ({
            updateOne: {
                filter: { _id: id, isDeleted: false },
                update: { $inc: { views: 1 } },
            },
        })));
    },
};
