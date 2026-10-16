"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogPrompts = exports.curateContentIdeasPrompt = exports.seoAuditBlogPrompt = exports.draftBlogPostPrompt = exports.summarizeBlogPrompt = void 0;
const zod_1 = require("zod");
const blog_service_1 = require("../../../modules/Blog/blog.service");
const mcp_security_guard_1 = require("../../security/mcp.security.guard");
const mcp_config_1 = require("../../../config/mcp/mcp.config");
const AppError_1 = __importDefault(require("../../../utils/AppError"));
// ─── Shared Schemas ──────────────────────────────────────────────────────────
const mongoId = zod_1.z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid 24-character MongoDB ObjectId");
// ─── Prompt 1: summarize-blog ────────────────────────────────────────────────
const summarizeBlogArgs = {
    blogId: mongoId.describe("MongoDB ObjectId of the blog post to summarize"),
    detailLevel: zod_1.z
        .enum(["concise", "detailed", "bullet-points"])
        .optional()
        .describe("Summary format style (concise, detailed, or bullet-points; defaults to bullet-points)"),
};
exports.summarizeBlogPrompt = {
    name: "summarize-blog",
    description: "Generates a prompt to analyze and summarize a blog post, extracting key takeaways, " +
        "evaluating readability, and recommending tag/category improvements. " +
        "Uses the blog post from blogService and embeds resource blog://post/{id}.",
    argsSchema: summarizeBlogArgs,
    handler: (0, mcp_security_guard_1.guardPromptHandler)(async (args) => {
        const { blogId, detailLevel = "bullet-points" } = args;
        let blog;
        try {
            blog = await blog_service_1.blogService.getById(blogId);
        }
        catch (err) {
            const msg = err instanceof AppError_1.default ? err.message : String(err);
            return {
                description: `Error retrieving blog post ${blogId}`,
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Unable to fetch blog post with ID "${blogId}": ${msg}. Please verify the blog ID using the "search-blogs" or "get-all-blogs" tool, or browse "blog://catalogue".`,
                        },
                    },
                ],
            };
        }
        if (!blog) {
            return {
                description: `Blog post ${blogId} not found`,
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Blog post with ID "${blogId}" was not found. Use the "search-blogs" tool or view the "blog://catalogue" resource to find valid blog posts.`,
                        },
                    },
                ],
            };
        }
        const uri = `blog://post/${blogId}`;
        const sanitizedBlog = blog_service_1.blogService.sanitizeBlog(blog);
        return {
            description: `Summarization request for "${blog.heading}"`,
            messages: [
                {
                    role: "user",
                    content: {
                        type: "resource",
                        resource: {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(sanitizedBlog, null, 2),
                        },
                    },
                },
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are an expert editorial assistant. Please review the blog post provided above in resource "${uri}".\n\n` +
                            `Title: "${blog.heading}"\n` +
                            `Current Status: ${blog.status}\n` +
                            `Metrics: ${blog.views} views, ${blog.likeCount} likes, ${blog.commentCount} comments\n\n` +
                            `Please provide a high-quality summary with the following structure:\n` +
                            `1. Format style: ${detailLevel}\n` +
                            `2. Core thesis & main takeaways (3–5 key points)\n` +
                            `3. Target audience & prerequisites\n` +
                            `4. Recommendations for SEO tags and category enhancements\n\n` +
                            `Tip: If tags or categories should be updated, you can recommend using the "update-blog" tool with the refined metadata.`,
                    },
                },
            ],
        };
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "summarize-blog" }),
};
// ─── Prompt 2: draft-blog-post ───────────────────────────────────────────────
const draftBlogPostArgs = {
    topic: zod_1.z.string().min(3).describe("Topic, concept, or working title for the new blog post"),
    category: zod_1.z.string().optional().describe("Primary category name (e.g. Technology, Architecture, Tutorial)"),
    targetAudience: zod_1.z.string().optional().describe("Target reader persona (e.g. Beginners, Senior Engineers, Team Leads)"),
    authorId: mongoId.optional().describe("MongoDB ObjectId of author user (optional: bound to authenticated token)"),
};
exports.draftBlogPostPrompt = {
    name: "draft-blog-post",
    description: "[Protected] Generates a comprehensive drafting prompt guiding the assistant to write a publication-ready blog post. " +
        "Provides instructions aligned with the Blog_Back schema so the draft can immediately be saved using the create-blog tool.",
    argsSchema: draftBlogPostArgs,
    handler: (0, mcp_security_guard_1.guardPromptHandler)(async (args, _extra, context) => {
        const { topic, category, targetAudience, authorId } = args;
        const effectiveAuthorId = context?.user.id ?? authorId;
        const categoryText = category ? `in the category "${category}"` : "in a relevant category";
        const audienceText = targetAudience ? `targeted at ${targetAudience}` : "targeted at general technical readers";
        const authorGuidance = effectiveAuthorId
            ? `When the user approves this draft, use the "create-blog" tool with "userId": "${effectiveAuthorId}" to persist it.`
            : `When ready to publish, the user can supply their author ID to the "create-blog" tool.`;
        return {
            description: `Drafting guide for topic: "${topic}"`,
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are a professional technical content writer and editor. Please draft a complete, compelling blog post on the topic: "${topic}" ${categoryText}, ${audienceText}.\n\n` +
                            `Drafting Requirements:\n` +
                            `1. Heading: Engaging title between 10 and 100 characters.\n` +
                            `2. Introduction: Hook the reader and state what problems are solved.\n` +
                            `3. Body: Use markdown sections (H2, H3), concrete examples, and code snippets where relevant.\n` +
                            `4. Conclusion: Summarize lessons learned and provide practical next steps.\n` +
                            `5. Metadata Suggestions:\n` +
                            `   - tags: Array of 3–6 lowercase tags (e.g. ["nodejs", "architecture"])\n` +
                            `   - category: Array containing the relevant category\n\n` +
                            `Integration with MCP Tools:\n` +
                            `${authorGuidance}\n` +
                            `Expected payload for "create-blog":\n` +
                            `{\n` +
                            `  "heading": "<Your Title>",\n` +
                            `  "content": "<Full Markdown/HTML Content>",\n` +
                            `  "userId": "${effectiveAuthorId ?? "<Author MongoDB ObjectId>"}",\n` +
                            `  "tags": ["..."],\n` +
                            `  "category": ["${category ?? "Technology"}"],\n` +
                            `  "status": "draft"\n` +
                            `}`,
                    },
                },
            ],
        };
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "draft-blog-post" }),
};
// ─── Prompt 3: seo-audit-blog ────────────────────────────────────────────────
const seoAuditBlogArgs = {
    blogId: mongoId.describe("MongoDB ObjectId of the blog post to audit for SEO"),
};
exports.seoAuditBlogPrompt = {
    name: "seo-audit-blog",
    description: "[Protected] Audits an existing blog post for SEO quality, URL slug suitability, title effectiveness, " +
        "and keyword coverage. Directly embeds the blog post resource and produces ready-to-use update-blog arguments.",
    argsSchema: seoAuditBlogArgs,
    handler: (0, mcp_security_guard_1.guardPromptHandler)(async (args) => {
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
                            text: `Could not retrieve blog ${blogId}: ${msg}. Check blog ID using "get-all-blogs".`,
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
                            text: `Blog with ID "${blogId}" was not found. Browse "blog://catalogue" or call "search-blogs".`,
                        },
                    },
                ],
            };
        }
        const uri = `blog://post/${blogId}`;
        const sanitized = blog_service_1.blogService.sanitizeBlog(blog);
        return {
            description: `SEO Audit prompt for "${blog.heading}"`,
            messages: [
                {
                    role: "user",
                    content: {
                        type: "resource",
                        resource: {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(sanitized, null, 2),
                        },
                    },
                },
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are an SEO and technical content optimization consultant. Analyze the blog post provided above in "${uri}".\n\n` +
                            `Current Metadata:\n` +
                            `- Title: "${blog.heading}"\n` +
                            `- Slug: "${blog.slug}"\n` +
                            `- Tags: ${JSON.stringify(blog.tags)}\n` +
                            `- Category: ${JSON.stringify(blog.category)}\n` +
                            `- Views: ${blog.views}, Popularity Score: ${blog.popularityScore}\n\n` +
                            `Please perform a comprehensive audit:\n` +
                            `1. Title & Heading Evaluation: Character count, keyword placement, click-through appeal.\n` +
                            `2. URL Slug Analysis: Evaluate length, readability, and stop-word usage.\n` +
                            `3. Content Structure: Headings hierarchy (H1/H2/H3), introduction strength, keyword density.\n` +
                            `4. Taxonomy Optimization: Recommend specific tag replacements and category alignment.\n` +
                            `5. Concrete Update Proposal: Provide the exact JSON parameters for the "update-blog" tool so the author can apply these updates directly.`,
                    },
                },
            ],
        };
    }, { requireAuth: true, roles: ["user", "admin"], actionName: "seo-audit-blog" }),
};
// ─── Prompt 4: curate-content-ideas ──────────────────────────────────────────
const curateContentIdeasArgs = {
    category: zod_1.z.string().optional().describe("Optional category to filter ideas (e.g. Technology)"),
    count: zod_1.z.string().optional().describe("Number of content ideas to generate (default: 5)"),
};
exports.curateContentIdeasPrompt = {
    name: "curate-content-ideas",
    description: "Examines the existing popular blogs in the catalogue (via blogService and blog://popular resource) " +
        "to identify popular trends, uncover content gaps, and propose new high-engagement article ideas.",
    argsSchema: curateContentIdeasArgs,
    handler: (0, mcp_security_guard_1.guardPromptHandler)(async (args) => {
        const { category, count = "5" } = args;
        let popularPosts;
        try {
            popularPosts = await blog_service_1.blogService.getAllByPopularity(undefined, 10);
        }
        catch {
            popularPosts = await blog_service_1.blogService.getAllBlogs(undefined, 10);
        }
        const uri = "blog://popular";
        return {
            description: "Content curation and ideation based on blog catalogue",
            messages: [
                {
                    role: "user",
                    content: {
                        type: "resource",
                        resource: {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(popularPosts, null, 2),
                        },
                    },
                },
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are the Chief Content Strategist for our engineering blog platform. ` +
                            `Above is the current snapshot of top performing articles from "${uri}".\n\n` +
                            `${category ? `Focus area: Category "${category}"\n\n` : ""}` +
                            `Based on what content already exists in the catalogue:\n` +
                            `1. Identify which topics and themes are generating the highest engagement (likes, views, comments).\n` +
                            `2. Highlight underrepresented topics, missing tutorials, or logical follow-up articles.\n` +
                            `3. Propose ${count} fresh, unique article pitches. For each pitch include:\n` +
                            `   - Catchy Title\n` +
                            `   - Target Category & Tags\n` +
                            `   - Target Audience & Problem Statement\n` +
                            `   - Outline (3 key sections)\n\n` +
                            `Note: For any selected idea, the "draft-blog-post" prompt can be used to generate the draft, followed by "create-blog" tool to publish.`,
                    },
                },
            ],
        };
    }, { requireAuth: mcp_config_1.mcpConfig.security.strictMode, actionName: "curate-content-ideas" }),
};
// ─── Registries ──────────────────────────────────────────────────────────────
exports.blogPrompts = [
    exports.summarizeBlogPrompt,
    exports.draftBlogPostPrompt,
    exports.seoAuditBlogPrompt,
    exports.curateContentIdeasPrompt,
];
