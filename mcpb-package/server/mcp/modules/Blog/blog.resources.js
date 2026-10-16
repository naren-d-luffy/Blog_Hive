"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogResourceTemplates = exports.blogStaticResources = exports.blogBySlugTemplate = exports.blogByIdTemplate = exports.blogPopularResource = exports.blogCatalogueResource = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const blog_service_1 = require("../../../modules/Blog/blog.service");
const mcp_helpers_1 = require("../../utils/mcp.helpers");
const mcp_security_guard_1 = require("../../security/mcp.security.guard");
const mcp_config_1 = require("../../../config/mcp/mcp.config");
// ─── URI scheme ───────────────────────────────────────────────────────────────
//
//  Static resources:
//    blog://catalogue          – first page of all published blogs (newest first)
//    blog://popular            – first page of blogs sorted by popularity score
//
//  Resource templates (dynamic URIs):
//    blog://post/{id}          – a single blog post by MongoDB ObjectId
//    blog://slug/{slug}        – a single published blog post by its URL slug
//
// ─────────────────────────────────────────────────────────────────────────────
// ─── Static resources ─────────────────────────────────────────────────────────
/** blog://catalogue — the first page of published blogs (newest first) */
exports.blogCatalogueResource = {
    uri: "blog://catalogue",
    name: "Blog Catalogue",
    description: "A snapshot of the first page (up to 20 items) of all published blog posts, " +
        "sorted by creation date descending. Use the get-all-blogs tool for paginated access.",
    mimeType: "application/json",
    readHandler: (0, mcp_security_guard_1.guardStaticResource)((async (uri) => {
        try {
            const result = await blog_service_1.blogService.getAllBlogs(undefined, 20);
            return (0, mcp_helpers_1.formatResourceSuccess)(uri.href, result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    }), { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "blog://catalogue" }),
};
/** blog://popular — first page of blogs sorted by popularity score */
exports.blogPopularResource = {
    uri: "blog://popular",
    name: "Popular Blogs",
    description: "A snapshot of the top 20 blogs ranked by their popularity score " +
        "(weighted combination of views, likes and comment count).",
    mimeType: "application/json",
    readHandler: (0, mcp_security_guard_1.guardStaticResource)((async (uri) => {
        try {
            const result = await blog_service_1.blogService.getAllByPopularity(undefined, 20);
            return (0, mcp_helpers_1.formatResourceSuccess)(uri.href, result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    }), { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "blog://popular" }),
};
// ─── Resource templates ───────────────────────────────────────────────────────
/** blog://post/{id} — fetch a single blog post by its MongoDB ObjectId */
exports.blogByIdTemplate = {
    template: new mcp_js_1.ResourceTemplate("blog://post/{id}", { list: undefined }),
    name: "Blog Post by ID",
    description: "Returns the full details of a single blog post identified by its MongoDB ObjectId. " +
        "Example URI: blog://post/6630f1e2c1234abc567890ef",
    mimeType: "application/json",
    readHandler: (0, mcp_security_guard_1.guardTemplateResource)((async (uri, variables) => {
        const id = String(variables["id"] ?? "");
        try {
            const result = await blog_service_1.blogService.getById(id);
            return (0, mcp_helpers_1.formatResourceSuccess)(uri.href, result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    }), { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "blog://post/{id}" }),
};
/** blog://slug/{slug} — fetch a single published blog post by its URL slug */
exports.blogBySlugTemplate = {
    template: new mcp_js_1.ResourceTemplate("blog://slug/{slug}", { list: undefined }),
    name: "Blog Post by Slug",
    description: "Returns a single published blog post identified by its URL-friendly slug. " +
        "Example URI: blog://slug/my-first-post-abc123",
    mimeType: "application/json",
    readHandler: (0, mcp_security_guard_1.guardTemplateResource)((async (uri, variables) => {
        const slug = String(variables["slug"] ?? "");
        try {
            const result = await blog_service_1.blogService.getBySlug(slug);
            return (0, mcp_helpers_1.formatResourceSuccess)(uri.href, result);
        }
        catch (err) {
            return (0, mcp_helpers_1.formatResourceError)(uri.href, err);
        }
    }), { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "blog://slug/{slug}" }),
};
// ─── Registries ───────────────────────────────────────────────────────────────
/** Static (non-templated) blog resources */
exports.blogStaticResources = [exports.blogCatalogueResource, exports.blogPopularResource];
/** Templated (dynamic-URI) blog resources */
exports.blogResourceTemplates = [exports.blogByIdTemplate, exports.blogBySlugTemplate];
