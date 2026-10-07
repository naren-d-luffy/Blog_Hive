"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueSlug = exports.generateSlug = void 0;
const slugify_1 = __importDefault(require("slugify"));
const blog_repository_1 = require("../modules/Blog/blog.repository");
const env_config_1 = __importDefault(require("../config/env.config"));
const MAX_SLUG_LENGTH = env_config_1.default.MAX_SLUG_LENGTH;
const generateSlug = (text) => {
    return (0, slugify_1.default)(text, {
        lower: true,
        strict: true,
        trim: true,
    }).substring(0, MAX_SLUG_LENGTH);
};
exports.generateSlug = generateSlug;
const generateUniqueSlug = async (title, options) => {
    const base = (0, exports.generateSlug)(title);
    const regex = new RegExp(`^${base}(-\\d+)?$`, "i");
    const existingSlug = await blog_repository_1.blogRepository.findBySlugByRegex(regex, options?.excludedId);
    if (existingSlug.length === 0)
        return base;
    const number = existingSlug.map((doc) => {
        const match = doc.slug.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    })
        .sort((a, b) => b - a);
    const nextNumber = (number[0] || 0) + 1;
    return `${base}-${nextNumber}`;
};
exports.generateUniqueSlug = generateUniqueSlug;
