"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentPrompts = exports.synthesizeCommentFeedbackPrompt = exports.moderateBlogCommentsPrompt = void 0;
const zod_1 = require("zod");
const blog_service_1 = require("../../../modules/Blog/blog.service");
const comment_service_1 = require("../../../modules/Comment/comment.service");
const mcp_security_guard_1 = require("../../security/mcp.security.guard");
const AppError_1 = __importDefault(require("../../../utils/AppError"));
// ─── Shared Schemas ──────────────────────────────────────────────────────────
const mongoId = zod_1.z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid 24-character MongoDB ObjectId");
// ─── Prompt 1: moderate-blog-comments (Admin Only) ───────────────────────────
const moderateBlogCommentsArgs = {
    blogId: mongoId.describe("MongoDB ObjectId of the blog post whose comments need moderation"),
    limit: zod_1.z
        .string()
        .optional()
        .describe("Max comments to inspect (string number between 1 and 50; default: 20)"),
};
exports.moderateBlogCommentsPrompt = {
    name: "moderate-blog-comments",
    description: "[Admin Only] Loads recent comments for a blog post (via commentService and comment://blog/{blogId}) " +
        "and generates a moderation analysis prompt to detect toxicity, spam, or policy violations, " +
        "providing actionable arguments for the delete-comment tool.",
    argsSchema: moderateBlogCommentsArgs,
    handler: (0, mcp_security_guard_1.guardPromptHandler)(async (args, _extra, context) => {
        const { blogId, limit } = args;
        const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
        let blog;
        try {
            blog = await blog_service_1.blogService.getById(blogId);
        }
        catch (err) {
            const msg = err instanceof AppError_1.default ? err.message : String(err);
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
            commentsResult = await comment_service_1.commentService.getComments(blogId, undefined, parsedLimit);
        }
        catch (err) {
            const msg = err instanceof AppError_1.default ? err.message : String(err);
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
        const adminId = context?.user.id ?? "<Admin User ID>";
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
                        text: `You are a community safety and moderation officer. Above are ${commentCount} recent comments from "${commentsUri}" ` +
                            `on the blog post "${blog.heading}" (Blog ID: ${blogId}).\n\n` +
                            `Review each comment according to standard community guidelines:\n` +
                            `1. Safety & Harassment: Identify any abusive language, hate speech, or harassment.\n` +
                            `2. Spam & Promotions: Flag unsolicited promotional links, phishing, or bot spam.\n` +
                            `3. Moderation Verdict: For each comment, classify as [APPROVED], [NEEDS_REVIEW], or [FLAGGED_REMOVE].\n` +
                            `4. Enforcement Action:\n` +
                            `   For any comment flagged for removal, supply the exact arguments to call the "delete-comment" tool:\n` +
                            `   {\n` +
                            `     "commentId": "<Comment ID>",\n` +
                            `     "requesterId": "${adminId}",\n` +
                            `     "requesterRole": "admin"\n` +
                            `   }`,
                    },
                },
            ],
        };
    }, { requireAuth: true, roles: ["admin"], actionName: "moderate-blog-comments" }),
};
// ─── Prompt 2: synthesize-comment-feedback ───────────────────────────────────
const synthesizeCommentFeedbackArgs = {
    blogId: mongoId.describe("MongoDB ObjectId of the blog post to synthesize reader feedback for"),
};
exports.synthesizeCommentFeedbackPrompt = {
    name: "synthesize-comment-feedback",
    description: "[Protected] Aggregates and analyzes reader feedback and comments on a blog post using commentService. " +
        "Identifies recurring questions, community sentiment, and prepares suggested replies for the add-comment tool.",
    argsSchema: synthesizeCommentFeedbackArgs,
    handler: (0, mcp_security_guard_1.guardPromptHandler)(async (args, _extra, _context) => {
        const { blogId } = args;
        let blog;
        try {
            blog = await blog_service_1.blogService.getById(blogId);
        }
        catch (err) {
            const msg = err instanceof AppError_1.default ? err.message : String(err);
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
            commentsResult = await comment_service_1.commentService.getComments(blogId, undefined, 30);
        }
        catch {
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
                        text: `You are an author relations and audience engagement specialist. ` +
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
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "synthesize-comment-feedback" }),
};
// ─── Registries ──────────────────────────────────────────────────────────────
exports.commentPrompts = [
    exports.moderateBlogCommentsPrompt,
    exports.synthesizeCommentFeedbackPrompt,
];
