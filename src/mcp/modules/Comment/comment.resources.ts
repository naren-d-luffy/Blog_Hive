import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { commentService } from "../../../modules/Comment/comment.service";
import { formatResourceError, formatResourceSuccess } from "../../utils/mcp.helpers";

// ─── URI scheme ───────────────────────────────────────────────────────────────
//
//  Resource templates (dynamic URIs):
//    comment://blog/{blogId}            – root-level comments for a blog post
//    comment://replies/{commentId}      – replies nested under a specific comment
//
// ─────────────────────────────────────────────────────────────────────────────

/** comment://blog/{blogId} — root-level comments for a given blog post */
export const commentsByBlogTemplate = {
  template: new ResourceTemplate("comment://blog/{blogId}", { list: undefined }),
  name: "Comments for Blog",
  description:
    "Returns the first page (up to 20) of root-level comments for a specific blog post, " +
    "identified by its MongoDB ObjectId. " +
    "Example URI: comment://blog/6630f1e2c1234abc567890ef",
  mimeType: "application/json" as const,
  readHandler: (async (uri: URL, variables) => {
    const blogId = String(variables["blogId"] ?? "");
    try {
      const result = await commentService.getComments(blogId, undefined, 20);
      return formatResourceSuccess(uri.href, result);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceTemplateCallback,
};

/** comment://replies/{commentId} — replies nested under a specific comment */
export const repliesByCommentTemplate = {
  template: new ResourceTemplate("comment://replies/{commentId}", { list: undefined }),
  name: "Replies for Comment",
  description:
    "Returns the first page (up to 20) of reply comments nested under a specific parent comment, " +
    "identified by its MongoDB ObjectId. " +
    "Example URI: comment://replies/6630f1e2c1234abc567890ab",
  mimeType: "application/json" as const,
  readHandler: (async (uri: URL, variables) => {
    const commentId = String(variables["commentId"] ?? "");
    try {
      const result = await commentService.getReplies(commentId, undefined, 20);
      return formatResourceSuccess(uri.href, result);
    } catch (err) {
      return formatResourceError(uri.href, err);
    }
  }) as ReadResourceTemplateCallback,
};

// ─── Registries ───────────────────────────────────────────────────────────────

/** Templated (dynamic-URI) comment resources */
export const commentResourceTemplates = [
  commentsByBlogTemplate,
  repliesByCommentTemplate,
] as const;
