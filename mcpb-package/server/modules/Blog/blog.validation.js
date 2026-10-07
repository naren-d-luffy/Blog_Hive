"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlogSchema = exports.createBlogSchema = void 0;
const zod_1 = require("zod");
// Mongo ObjectId validator
const objectId = zod_1.z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
// Create BLOG
exports.createBlogSchema = zod_1.z.object({
    heading: zod_1.z.string().min(3, "Heading must be at least 3 characters").max(150, "Heading too long").trim(),
    content: zod_1.z.string().min(10, "Content must be at least 10 characters"),
    tags: zod_1.z.array(zod_1.z.string().trim()).optional(),
    category: zod_1.z.array(zod_1.z.string().trim()).optional(),
    status: zod_1.z.enum(["draft", "published", "archived"]).optional(),
});
// Update BLOG
exports.updateBlogSchema = zod_1.z.object({
    heading: zod_1.z.string().min(3).max(150).trim().optional(),
    content: zod_1.z.string().min(10).optional(),
    tags: zod_1.z.array(zod_1.z.string().trim()).optional(),
    category: zod_1.z.array(zod_1.z.string().trim()).optional(),
    status: zod_1.z.enum(["draft", "published", "archived"]).optional(),
    updatedBy: objectId.optional(),
});
