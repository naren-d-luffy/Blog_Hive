import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReadResourceCallback, ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { blogService } from "../../../modules/Blog/blog.service";
import { formatResourceError, formatResourceSuccess } from "../../utils/mcp.helpers";

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
export const blogCatalogueResource = {
  uri: "blog://catalogue",
  name: "Blog Catalogue",
  description:
    "A snapshot of the first page (up to 20 items) of all published blog posts, " +
    "sorted by creation date descending. Use the get-all-blogs tool for paginated access.",
  mimeType: "application/json" as const,
  readHandler: (async (uri: URL) => {
    try {
      const result = await blogService.getAllBlogs(undefined, 20);
      return formatResourceSuccess(uri.href, result);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceCallback,
};

/** blog://popular — first page of blogs sorted by popularity score */
export const blogPopularResource = {
  uri: "blog://popular",
  name: "Popular Blogs",
  description:
    "A snapshot of the top 20 blogs ranked by their popularity score " +
    "(weighted combination of views, likes and comment count).",
  mimeType: "application/json" as const,
  readHandler: (async (uri: URL) => {
    try {
      const result = await blogService.getAllByPopularity(undefined, 20);
      return formatResourceSuccess(uri.href, result);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceCallback,
};

// ─── Resource templates ───────────────────────────────────────────────────────

/** blog://post/{id} — fetch a single blog post by its MongoDB ObjectId */
export const blogByIdTemplate = {
  template: new ResourceTemplate("blog://post/{id}", { list: undefined }),
  name: "Blog Post by ID",
  description:
    "Returns the full details of a single blog post identified by its MongoDB ObjectId. " +
    "Example URI: blog://post/6630f1e2c1234abc567890ef",
  mimeType: "application/json" as const,
  readHandler: (async (uri: URL, variables) => {
    const id = String(variables["id"] ?? "");
    try {
      const result = await blogService.getById(id);
      return formatResourceSuccess(uri.href, result);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceTemplateCallback,
};

/** blog://slug/{slug} — fetch a single published blog post by its URL slug */
export const blogBySlugTemplate = {
  template: new ResourceTemplate("blog://slug/{slug}", { list: undefined }),
  name: "Blog Post by Slug",
  description:
    "Returns a single published blog post identified by its URL-friendly slug. " +
    "Example URI: blog://slug/my-first-post-abc123",
  mimeType: "application/json" as const,
  readHandler: (async (uri: URL, variables) => {
    const slug = String(variables["slug"] ?? "");
    try {
      const result = await blogService.getBySlug(slug);
      return formatResourceSuccess(uri.href, result);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceTemplateCallback,
};

// ─── Registries ───────────────────────────────────────────────────────────────

/** Static (non-templated) blog resources */
export const blogStaticResources = [blogCatalogueResource, blogPopularResource] as const;

/** Templated (dynamic-URI) blog resources */
export const blogResourceTemplates = [blogByIdTemplate, blogBySlugTemplate] as const;
