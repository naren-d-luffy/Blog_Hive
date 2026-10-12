import { z } from "zod";
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { blogService } from "../../../modules/Blog/blog.service";
import { commentService } from "../../../modules/Comment/comment.service";
import AppError from "../../../utils/AppError";

// ─── Shared Schemas ──────────────────────────────────────────────────────────

const mongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid 24-character MongoDB ObjectId");

// ─── Prompt 1: moderate-blog-comments ────────────────────────────────────────

const moderateBlogCommentsArgs = {
  blogId: mongoId.describe("MongoDB ObjectId of the blog post whose comments need moderation"),
  limit: z
    .string()
    .optional()
    .describe("Max comments to inspect (string number between 1 and 50; default: 20)"),
};

export const moderateBlogCommentsPrompt = {
  name: "moderate-blog-comments",
  description:
    "Loads recent comments for a blog post (via commentService and comment://blog/{blogId}) " +
    "and generates a moderation analysis prompt to detect toxicity, spam, or policy violations, " +
    "providing actionable arguments for the delete-comment tool.",
  argsSchema: moderateBlogCommentsArgs,
  handler: async (args: {
    blogId: string;
    limit?: string;
  }): Promise<GetPromptResult> => {
    const { blogId, limit } = args;
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    let blog;
    try {
      blog = await blogService.getById(blogId);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : String(err);
      return {
        description: `Error loading blog ${blogId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Could not load blog post ${blogId}: ${msg}. Please verify with "search-blogs".`,
            },
          },
        ],
      };
    }

    if (!blog) {
      return {
        description: `Blog ${blogId} not found`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Blog post ${blogId} not found. Browse "blog://catalogue" to find valid posts.`,
            },
          },
        ],
      };
    }

    let commentsResult;
    try {
      commentsResult = await commentService.getComments(blogId, undefined, parsedLimit);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : String(err);
      return {
        description: `Error loading comments for blog ${blogId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Could not retrieve comments for blog ${blogId}: ${msg}.`,
            },
          },
        ],
      };
    }

    const commentsUri = `comment://blog/${blogId}`;
    const commentCount = commentsResult?.sanitizedData?.length ?? 0;

    return {
      description: `Comment moderation review for "${blog.heading}"`,
      messages: [
        {
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: commentsUri,
              mimeType: "application/json",
              text: JSON.stringify(commentsResult, null, 2),
            },
          },
        },
        {
          role: "user",
          content: {
            type: "text",
            text:
              `You are a community safety and moderation officer. Above are ${commentCount} recent comments from "${commentsUri}" ` +
              `on the blog post "${blog.heading}" (Blog ID: ${blogId}).\n\n` +
              `Review each comment according to standard community guidelines:\n` +
              `1. Safety & Harassment: Identify any abusive language, hate speech, or harassment.\n` +
              `2. Spam & Promotions: Flag unsolicited promotional links, phishing, or bot spam.\n` +
              `3. Moderation Verdict: For each comment, classify as [APPROVED], [NEEDS_REVIEW], or [FLAGGED_REMOVE].\n` +
              `4. Enforcement Action:\n` +
              `   For any comment flagged for removal, supply the exact arguments to call the "delete-comment" tool:\n` +
              `   {\n` +
              `     "commentId": "<Comment ID>",\n` +
              `     "requesterId": "<Admin User ID>",\n` +
              `     "requesterRole": "admin"\n` +
              `   }`,
          },
        },
      ],
    };
  },
};

// ─── Prompt 2: synthesize-comment-feedback ───────────────────────────────────

const synthesizeCommentFeedbackArgs = {
  blogId: mongoId.describe("MongoDB ObjectId of the blog post to synthesize reader feedback for"),
};

export const synthesizeCommentFeedbackPrompt = {
  name: "synthesize-comment-feedback",
  description:
    "Aggregates and analyzes reader feedback and comments on a blog post using commentService. " +
    "Identifies recurring questions, community sentiment, and prepares suggested replies for the add-comment tool.",
  argsSchema: synthesizeCommentFeedbackArgs,
  handler: async (args: { blogId: string }): Promise<GetPromptResult> => {
    const { blogId } = args;

    let blog;
    try {
      blog = await blogService.getById(blogId);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : String(err);
      return {
        description: `Error loading blog ${blogId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Could not find blog ${blogId}: ${msg}.`,
            },
          },
        ],
      };
    }

    if (!blog) {
      return {
        description: `Blog ${blogId} not found`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Blog ${blogId} does not exist.`,
            },
          },
        ],
      };
    }

    let commentsResult;
    try {
      commentsResult = await commentService.getComments(blogId, undefined, 30);
    } catch {
      commentsResult = { sanitizedData: [] };
    }

    const commentsUri = `comment://blog/${blogId}`;
    const commentCount = commentsResult?.sanitizedData?.length ?? 0;

    return {
      description: `Reader feedback synthesis for "${blog.heading}"`,
      messages: [
        {
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: commentsUri,
              mimeType: "application/json",
              text: JSON.stringify(commentsResult, null, 2),
            },
          },
        },
        {
          role: "user",
          content: {
            type: "text",
            text:
              `You are an author relations and audience engagement specialist. ` +
              `Above are ${commentCount} reader comments from "${commentsUri}" on the article "${blog.heading}".\n\n` +
              `Please synthesize the audience reaction and provide actionable guidance for the author:\n` +
              `1. Sentiment Overview: Overall reader mood (e.g. enthusiastic, critical, confused).\n` +
              `2. Frequently Asked Questions (FAQs): Questions readers asked that require clarification.\n` +
              `3. Key Constructive Feedback: Useful points, errata, or improvements mentioned by readers.\n` +
              `4. Suggested Responses: Draft 1–3 thoughtful responses the author can post using the "add-comment" tool ` +
              `(providing blogId: "${blogId}", parentCommentId if replying to a thread, and content).\n` +
              `5. Follow-Up Article Ideas: Topics requested by readers to address in future posts.`,
          },
        },
      ],
    };
  },
};

// ─── Registries ──────────────────────────────────────────────────────────────

export const commentPrompts = [
  moderateBlogCommentsPrompt,
  synthesizeCommentFeedbackPrompt,
] as const;
