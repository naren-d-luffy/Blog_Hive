"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogController = void 0;
const blog_service_1 = require("./blog.service");
const blog_validation_1 = require("./blog.validation");
const AppError_1 = __importDefault(require("../../utils/AppError"));
const toString_1 = require("../../utils/toString");
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const parseCursor_1 = __importDefault(require("../../utils/Cursor/parseCursor"));
// Controller
exports.blogController = {
    createBlog: (0, asyncHandler_1.default)(async (req, res) => {
        const id = req.user?.id;
        if (!id)
            throw new AppError_1.default("Authentication required", 401);
        const result = blog_validation_1.createBlogSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }
        const blog = await blog_service_1.blogService.createBlog(result.data, id);
        return res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: blog,
        });
    }),
    getAllBlogs: (0, asyncHandler_1.default)(async (req, res) => {
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await blog_service_1.blogService.getAllBlogs(cursor, limit);
        return res.status(200).json({
            success: true,
            message: "Blogs fetched successfully",
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            },
        });
    }),
    getAllByPopularity: (0, asyncHandler_1.default)(async (req, res) => {
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await blog_service_1.blogService.getAllByPopularity(cursor, limit);
        return res.status(200).json({
            success: true,
            message: "Trending blogs fetched successfully",
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            },
        });
    }),
    getAllByCategory: (0, asyncHandler_1.default)(async (req, res) => {
        const category = (0, toString_1.str)(req.params.category).trim();
        if (!category)
            throw new AppError_1.default("Category is required", 400);
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await blog_service_1.blogService.getAllByCategory(category, cursor, limit);
        return res.status(200).json({
            success: true,
            message: `Blogs for category '${category}' fetched successfully`,
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            },
        });
    }),
    getAllByTag: (0, asyncHandler_1.default)(async (req, res) => {
        const tag = (0, toString_1.str)(req.params.tag).trim();
        if (!tag)
            throw new AppError_1.default("Tag is required", 400);
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await blog_service_1.blogService.getAllByTag(tag, cursor, limit);
        return res.status(200).json({
            success: true,
            message: `Blogs for tag '${tag}' fetched successfully`,
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            },
        });
    }),
    getAllByAuthor: (0, asyncHandler_1.default)(async (req, res) => {
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const result = await blog_service_1.blogService.getAllByAuthor((0, toString_1.str)(req.params.userId), cursor, limit);
        return res.status(200).json({
            success: true,
            message: "Author blogs fetched successfully",
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            },
        });
    }),
    searchBlogs: (0, asyncHandler_1.default)(async (req, res) => {
        const query = (0, toString_1.str)(req.query.q).trim();
        if (query.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }
        const { cursor, limit } = (0, parseCursor_1.default)(req.query);
        const page = req.query.page ? parseInt((0, toString_1.str)(req.query.page), 10) : undefined;
        const result = await blog_service_1.blogService.searchBlogs(query, { cursor, page }, limit);
        return res.status(200).json({
            success: true,
            message: "Search results fetched successfully",
            query,
            data: result.sanitizedData,
            pagination: {
                limit: result.limit,
                hasNextPage: result.hasNextPage,
                nextCursor: result.nextCursor,
            },
        });
    }),
    getById: (0, asyncHandler_1.default)(async (req, res) => {
        const blog = await blog_service_1.blogService.getById((0, toString_1.str)(req.params.id));
        return res.status(200).json({
            success: true,
            message: "Blog fetched successfully",
            data: blog,
        });
    }),
    getBySlug: (0, asyncHandler_1.default)(async (req, res) => {
        const blog = await blog_service_1.blogService.getBySlug((0, toString_1.str)(req.params.slug));
        return res.status(200).json({
            success: true,
            message: "Blog fetched successfully",
            data: blog,
        });
    }),
    updateBlog: (0, asyncHandler_1.default)(async (req, res) => {
        const result = blog_validation_1.updateBlogSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role;
        if (!requesterId)
            throw new AppError_1.default("Authentication required", 401);
        if (!requesterRole)
            throw new AppError_1.default("Role is required", 403);
        const updated = await blog_service_1.blogService.updateBlog((0, toString_1.str)(req.params.id), result.data, requesterId, requesterRole);
        return res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            data: updated,
        });
    }),
    deleteBlog: (0, asyncHandler_1.default)(async (req, res) => {
        const requesterId = req.user?.id;
        const requesterRole = req.user?.role;
        if (!requesterId)
            throw new AppError_1.default("Authentication required", 401);
        if (!requesterRole)
            throw new AppError_1.default("Role is required", 403);
        const result = await blog_service_1.blogService.deleteBlog((0, toString_1.str)(req.params.id), requesterId, requesterRole);
        return res.status(200).json({
            success: true,
            message: "Blog deleted successfully",
            data: result,
        });
    }),
    trackView: (0, asyncHandler_1.default)(async (req, res) => {
        const ip = req.ip;
        const userId = req.user?.id;
        const result = blog_service_1.blogService.trackView((0, toString_1.str)(req.params.id), (0, toString_1.str)(ip), userId);
        return res
            .status(200)
            .json({ success: true, message: "View tracked", data: result });
    }),
    likeBlog: (0, asyncHandler_1.default)(async (req, res) => {
        const userId = req.user?.id;
        if (!userId)
            throw new AppError_1.default("Authentication required", 401);
        const result = await blog_service_1.blogService.likeBlog((0, toString_1.str)(req.params.id), userId);
        return res.status(200).json({
            success: true,
            message: "Blog liked successfully",
            data: result,
        });
    }),
    unlikeBlog: (0, asyncHandler_1.default)(async (req, res) => {
        const userId = req.user?.id;
        if (!userId)
            throw new AppError_1.default("Authentication required", 401);
        const result = await blog_service_1.blogService.unlikeBlog((0, toString_1.str)(req.params.id), userId);
        return res.status(200).json({
            success: true,
            message: "Blog unliked successfully",
            data: result,
        });
    }),
    reportBlog: (0, asyncHandler_1.default)(async (req, res) => {
        const result = await blog_service_1.blogService.reportBlog((0, toString_1.str)(req.params.id));
        return res
            .status(200)
            .json({ success: true, message: "Blog reported", data: result });
    }),
};
