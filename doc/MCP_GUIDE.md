# MCP Guide

Complete reference for the Blog Backend MCP (Model Context Protocol) server — architecture, tools, resources, prompts, security, distribution, and maintenance.

---

## Table of Contents

1. [What Is the MCP Server](#1-what-is-the-mcp-server)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Running the Server](#4-running-the-server)
5. [Security & Authentication](#5-security--authentication)
6. [Tools Reference](#6-tools-reference)
7. [Resources Reference](#7-resources-reference)
8. [Prompts Reference](#8-prompts-reference)
9. [Response Envelope](#9-response-envelope)
10. [Distribution — The .mcpb Extension](#10-distribution--the-mcpb-extension)
11. [Connecting to Claude Desktop](#11-connecting-to-claude-desktop)
12. [Maintenance & Update Workflow](#12-maintenance--update-workflow)
13. [Environment Variables](#13-environment-variables)

---

## 1. What Is the MCP Server

The Blog Backend exposes a second server process alongside the REST API. Instead of HTTP, it communicates over **stdio** using the [Model Context Protocol](https://modelcontextprotocol.io) — the open standard that lets LLM clients like Claude Desktop call structured tools, read resources, and use prompt templates.

Both servers share the same domain services, repositories, MongoDB models, and JWT secret. A token valid for the REST API is equally valid for the MCP server and vice versa.

```
Claude Desktop
      │  stdio (stdin/stdout)
      ▼
node src/mcp/server.ts   ←→   MongoDB + Redis
      │
      ├── 15 Blog Tools
      ├──  8 Comment Tools
      ├──  4 Static/Template Resources
      └──  6 Prompt Templates
```

---

## 2. Architecture

### How a request flows

```
Claude sends tool call
        │
        ▼
McpServer (@modelcontextprotocol/sdk)
        │
        ▼
guardToolHandler()          ← mcp.security.guard.ts
        │
        ├── extractTokenFromRequest()   ← checks 5 sources (see §5)
        ├── verifyAccessToken()         ← shared with REST API auth
        ├── authorizeRoles()            ← RBAC check
        ├── identity binding            ← anti-spoofing: overwrites userId/requesterId from token
        │
        ▼
Tool handler (blogService / commentService)
        │
        ▼
formatToolSuccess() / formatToolError()
        │
        ▼
Claude receives JSON result
```

### Shared code with the REST API

| Layer | Shared file |
|---|---|
| JWT verification | `src/auth/auth.core.ts` |
| Error type | `src/utils/AppError.ts` |
| Blog business logic | `src/modules/Blog/blog.service.ts` |
| Comment business logic | `src/modules/Comment/comment.service.ts` |
| Repositories & models | `src/modules/*/` |
| Env config & validation | `src/config/env.config.ts` |

### Security mode

A single env flag controls whether read-only operations require a token:

| `MCP_STRICT_AUTH` | Read tools / resources | Write tools |
|---|---|---|
| `false` (default) | Public — no token needed | Always require token |
| `true` | Require token | Always require token |

---

## 3. File Structure

```
src/mcp/
├── server.ts                         Entry point — bootstraps DB, registers all capabilities, connects stdio transport
├── config/
│   └── mcp.config.ts                 Server name, version, transport, capabilities, security flags
├── security/
│   ├── mcp.security.context.ts       Token extraction (5-source cascade) + JWT verification
│   ├── mcp.security.guard.ts         Guard wrappers for tools, resources, prompts + anti-spoofing
│   ├── mcp.security.token.ts         generateMcpAccessToken() — mints JWTs for MCP use
│   └── mcp.security.types.ts         McpSecurityContext, McpSecurityOptions interfaces
├── utils/
│   └── mcp.helpers.ts                formatToolSuccess/Error, formatResourceSuccess/Error
└── modules/
    ├── Blog/
    │   ├── blog.tools.ts             15 blog tool definitions
    │   ├── blog.resources.ts         2 static + 2 template resources
    │   └── blog.prompts.ts           4 prompt templates
    └── Comment/
        ├── comment.tools.ts          8 comment tool definitions
        ├── comment.resources.ts      2 template resources
        └── comment.prompts.ts        2 prompt templates

mcpb-package/                         Distribution package (compiled JS, bundled deps)
├── manifest.json                     .mcpb package descriptor
└── server/                           Compiled output — mirrors dist/

scripts/
└── mcp-token.ts                      CLI script to mint JWT tokens for Claude Desktop

blog-mcp.mcpb                         Packaged extension file — install this into Claude Desktop
```

---

## 4. Running the Server

### Standalone Streamable HTTP Service (Production Standard)

By default, the server runs as a dedicated Streamable HTTP microservice on port 3001:

```bash
# Development with live reload
npm run mcp:dev

# Direct start
npm run mcp:start
```

Once started, the following endpoints are available:
- `POST http://127.0.0.1:3001/mcp` — JSON-RPC command processing & session initialization
- `GET http://127.0.0.1:3001/mcp` — Standalone SSE notification stream (requires `Mcp-Session-Id` header)
- `DELETE http://127.0.0.1:3001/mcp` — Session termination
- `GET http://127.0.0.1:3001/health` — Diagnostics & active session metrics

### Interactive Test Client

```bash
# Connects to running Streamable HTTP server
npm run mcp:client

# Or test via STDIO transport fallback
npm run mcp:client -- --stdio
```

### Fallback: Running via STDIO Transport

If you wish to run the MCP server over STDIO (e.g. for Claude Desktop child process execution):

```bash
MCP_TRANSPORT=stdio npm run mcp:start
```

```bash
npm run mcp:start
```

### Production (compiled JS)

```bash
npm run build
node dist/mcp/server.js
```

### Interactive test client (REPL)

```bash
npm run mcp:client
```

The test client spawns the MCP server as a child process and gives you a REPL with commands: `list`, `call <tool>`, `resources`, `read <uri>`, `prompts`, `prompt <name>`, `auth <user|admin> [id]`, `token`, `whoami`, `help`, `exit`.

---

## 5. Security & Authentication

### Token extraction — 5-source cascade

`extractTokenFromRequest()` checks these sources in order and uses the first one found:

| Priority | Source | When it applies |
|---|---|---|
| 1 | `extra._meta.token` or `extra._meta.authorization` | Standard MCP protocol metadata |
| 2 | `extra.authInfo.token` | SDK transport layer auth |
| 3 | HTTP `Authorization` / `X-Access-Token` headers | HTTP/SSE transport |
| 4 | Input payload `.token` or `._meta.token` | Caller passes token in arguments |
| 5 | `process.env.MCP_ACCESS_TOKEN` | **Used by Claude Desktop .mcpb extension** |

For the `.mcpb` stdio extension, only source 5 is reachable. The token is passed as an env var by Claude Desktop using the `MCP_ACCESS_TOKEN` user config field in `manifest.json`.

### Anti-spoofing identity binding

After the token is verified, `guardToolHandler()` forcibly overwrites `userId`, `requesterId`, and `requesterRole` in the input payload with the values from the verified JWT. This means an LLM cannot elevate privileges by passing a different user ID or role in its tool arguments.

### Generating a token for Claude Desktop

```bash
npm run mcp:token -- --id <mongoUserId> --role <user|admin> --expires 90d
```

Copy the printed JWT and paste it into Claude Desktop → Settings → Extensions → Blog MCP → **Access Token (JWT)**.

The `--expires` flag accepts any value jsonwebtoken accepts: `90d`, `30d`, `8h`, etc. Default is `90d`.

---

## 6. Tools Reference

### Auth legend

- **Public** — no token required when `MCP_STRICT_AUTH=false`
- **[Protected]** — always requires a valid JWT with the listed role

---

### Blog Tools (15)

| Tool | Auth | Description |
|---|---|---|
| `get-all-blogs` | Public | Cursor-paginated list of all published blogs, newest first |
| `get-blogs-by-popularity` | Public | Published blogs ranked by weighted popularity score (views + likes + comments) |
| `get-blogs-by-category` | Public | Filter published blogs by category name (case-insensitive) |
| `get-blogs-by-tag` | Public | Filter published blogs by tag string (case-insensitive) |
| `get-blogs-by-author` | Public | Published blogs by a specific author (MongoDB ObjectId) |
| `search-blogs` | Public | Full-text search across blog headings and content |
| `get-blog-by-id` | Public | Full details of a single blog post by MongoDB ObjectId |
| `get-blog-by-slug` | Public | Single published blog post by URL slug |
| `create-blog` | [Protected] user/admin | Create a new blog post; author identity bound from token |
| `update-blog` | [Protected] user/admin | Update a blog; requester must be owner or admin |
| `delete-blog` | [Protected] user/admin | Soft-delete a blog; owner or admin only |
| `like-blog` | [Protected] user/admin | Add a like to a blog post (409 if already liked) |
| `unlike-blog` | [Protected] user/admin | Remove a like from a blog post |
| `report-blog` | [Protected] user/admin | Increment the report counter on a blog post |
| `track-view` | Public | Record a unique page view (Redis rate-limited per IP) |

#### Key input fields for blog tools

```
Pagination:
  cursor   string    Opaque cursor from previous response
  limit    number    Items per page (1–100, default 10)

Blog identity:
  blogId   string    24-char MongoDB ObjectId
  slug     string    URL-friendly slug (e.g. "my-post-abc123")

Create/Update:
  heading  string    Title (3–150 chars)
  content  string    Full body, HTML or Markdown (min 10 chars)
  tags     string[]  Lowercase tag strings
  category string[]  Category strings
  status   enum      "draft" | "published" | "archived"
```

---

### Comment Tools (8)

| Tool | Auth | Description |
|---|---|---|
| `get-comments` | Public | Paginated root-level comments for a blog post |
| `get-replies` | Public | Paginated replies under a parent comment |
| `create-comment` | [Protected] user/admin | Post a comment or reply; author identity bound from token |
| `update-comment` | [Protected] user/admin | Update own comment text; owner only |
| `delete-comment` | [Protected] user/admin | Soft-delete own comment; owner or admin |
| `like-comment` | [Protected] user/admin | Increment comment like counter |
| `unlike-comment` | [Protected] user/admin | Decrement comment like counter |
| `report-comment` | [Protected] user/admin | Increment comment report counter |

#### Key input fields for comment tools

```
commentId       string    24-char MongoDB ObjectId of the comment
blogId          string    24-char MongoDB ObjectId of the parent blog
parentCommentId string    Supply to post a reply instead of a root comment
content         string    Comment text (1–250 chars)
```

---

## 7. Resources Reference

Resources are read-only data endpoints that Claude can fetch by URI. They follow the `scheme://path` convention.

### Static Resources (2)

These are fixed URIs — always return the same snapshot.

| URI | Name | Description |
|---|---|---|
| `blog://catalogue` | Blog Catalogue | First 20 published blogs, newest first |
| `blog://popular` | Popular Blogs | Top 20 blogs by popularity score |

### Resource Templates (4)

Dynamic URIs where `{variable}` is substituted at read time.

| URI Template | Name | Description |
|---|---|---|
| `blog://post/{id}` | Blog Post by ID | Full blog post by MongoDB ObjectId |
| `blog://slug/{slug}` | Blog Post by Slug | Published blog post by URL slug |
| `comment://blog/{blogId}` | Comments for Blog | First 20 root-level comments for a blog |
| `comment://replies/{commentId}` | Replies for Comment | First 20 replies under a parent comment |

#### Example URIs

```
blog://catalogue
blog://popular
blog://post/6630f1e2c1234abc567890ef
blog://slug/my-first-post-abc123
comment://blog/6630f1e2c1234abc567890ef
comment://replies/6630f1e2c1234abc567890ab
```

---

## 8. Prompts Reference

Prompts are reusable LLM instruction templates. Claude fetches the prompt, which loads live data from the database, then uses it as context for the conversation.

### Blog Prompts (4)

#### `summarize-blog`
Fetches a blog post and instructs the LLM to summarize it with configurable detail level.

| Argument | Type | Required | Description |
|---|---|---|---|
| `blogId` | string | Yes | MongoDB ObjectId of the blog to summarize |
| `detailLevel` | enum | No | `concise` / `detailed` / `bullet-points` (default: `bullet-points`) |

Auth: Public (respects `MCP_STRICT_AUTH`)

---

#### `draft-blog-post`
Guides the LLM to write a complete, publication-ready blog post aligned with the Blog schema. Produces a ready-to-use `create-blog` tool payload.

| Argument | Type | Required | Description |
|---|---|---|---|
| `topic` | string | Yes | Working title or topic (min 3 chars) |
| `category` | string | No | Primary category (e.g. `Technology`) |
| `targetAudience` | string | No | Reader persona (e.g. `Senior Engineers`) |
| `authorId` | string | No | MongoDB ObjectId — auto-bound from token if omitted |

Auth: **[Protected]** — user/admin

---

#### `seo-audit-blog`
Loads a blog post and instructs the LLM to perform a comprehensive SEO analysis, producing exact `update-blog` arguments to apply improvements.

| Argument | Type | Required | Description |
|---|---|---|---|
| `blogId` | string | Yes | MongoDB ObjectId of the blog to audit |

Auth: **[Protected]** — user/admin

---

#### `curate-content-ideas`
Loads the top popular blogs and instructs the LLM to identify content gaps and pitch new article ideas.

No arguments required.

Auth: Public (respects `MCP_STRICT_AUTH`)

---

### Comment Prompts (2)

#### `moderate-blog-comments`
Loads recent comments for a blog post and instructs the LLM to classify each one and provide exact `delete-comment` arguments for any that violate community guidelines.

| Argument | Type | Required | Description |
|---|---|---|---|
| `blogId` | string | Yes | MongoDB ObjectId of the blog post |
| `limit` | string | No | Max comments to inspect (1–50, default 20) |

Auth: **[Admin Only]**

---

#### `synthesize-comment-feedback`
Aggregates reader comments for a blog post and instructs the LLM to produce sentiment analysis, FAQs, and suggested author replies.

| Argument | Type | Required | Description |
|---|---|---|---|
| `blogId` | string | Yes | MongoDB ObjectId of the blog post |

Auth: **[Protected]** — user/admin

---

## 9. Response Envelope

All tools and resources return JSON wrapped in a consistent envelope.

### Success

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized: Authentication token is required for \"create-blog\".",
  "details": {}
}
```

For tools, errors also set `isError: true` on the MCP content item so Claude Desktop surfaces them as error responses rather than normal text.

---

## 10. Distribution — The .mcpb Extension

The `.mcpb` file is a zip archive containing the compiled server and all its dependencies. It lets users install the MCP server into Claude Desktop with a single click — no cloning the repo, no manual JSON config.

### Package structure

```
blog-mcp.mcpb  (ZIP)
├── manifest.json           Package descriptor
└── server/                 Compiled JS output (mirrors dist/)
    ├── mcp/server.js        MCP server entry point
    ├── config/              Compiled config files
    ├── modules/             Compiled domain modules
    ├── ...
    └── node_modules/        Bundled production dependencies
```

### manifest.json overview

```json
{
  "manifest_version": "0.3",
  "name": "blog-mcp",
  "server": {
    "type": "node",
    "entry_point": "server/mcp/server.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/server/mcp/server.js"],
      "env": {
        "MCP_ENV_FILE":      "${user_config.env_file}",
        "MCP_ACCESS_TOKEN":  "${user_config.access_token}"
      }
    }
  },
  "user_config": {
    "env_file":      { "type": "file",   "required": true  },
    "access_token":  { "type": "string", "sensitive": true, "required": false }
  }
}
```

`${user_config.*}` values are collected from the user during installation via Claude Desktop's settings UI and passed to the server process as env vars.

---

## 11. Connecting to Claude Desktop

### Option A — .mcpb extension (recommended for personal use)

1. Generate a token (see §5)
2. Install: drag `blog-mcp.mcpb` onto the Claude Desktop window, or go to **Settings → Extensions → Advanced settings → Install Extension**
3. When prompted, select your `.env` file and paste your JWT token
4. The extension appears in **Settings → Extensions** — toggle it on

### Option B — claude_desktop_config.json (for development)

Build first, then add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blog-mcp": {
      "command": "node",
      "args": ["D:\\Ramnaren_Files\\Personal\\Blog_Back\\dist\\mcp\\server.js"],
      "env": {
        "MCP_ENV_FILE":     "D:\\Ramnaren_Files\\Personal\\Blog_Back\\.env",
        "MCP_ACCESS_TOKEN": "<your-jwt-token>"
      }
    }
  }
}
```

Do not use both methods at the same time — uninstall the extension if using the config file.

---

## 12. Maintenance & Update Workflow

### Updating after source changes

```bash
# 1. Build TypeScript → dist/
npm run build

# 2. Sync dist/ into mcpb-package/server/ and repack the .mcpb
npm run mcpb:build
```

Then in Claude Desktop: **uninstall** the old extension → install the new `blog-mcp.mcpb`.

### npm scripts reference

| Script | What it does |
|---|---|
| `npm run mcp:start` | Run MCP server with ts-node (dev) |
| `npm run mcp:dev` | Run MCP server with ts-node-dev (watch mode) |
| `npm run mcp:client` | Launch the interactive REPL test client |
| `npm run mcp:token -- --id <id> --role <role>` | Mint a JWT for Claude Desktop |
| `npm run build` | Compile TypeScript → dist/ |
| `npm run mcpb:sync` | Copy dist/ into mcpb-package/server/ |
| `npm run mcpb:pack` | Pack mcpb-package/ → blog-mcp.mcpb |
| `npm run mcpb:build` | Full rebuild: build + sync + pack |

### Rotating the access token

Tokens do not auto-rotate. When your token expires (or you want to revoke it):

```bash
npm run mcp:token -- --id <mongoUserId> --role <user|admin> --expires 90d
```

Then in Claude Desktop → Settings → Extensions → Blog MCP → configure → paste the new token. **No reinstall required** — this is a settings-only update.

### Adding a new tool

1. Define the tool in `src/mcp/modules/Blog/blog.tools.ts` or `comment.tools.ts`
2. Add it to the exported registry array at the bottom of the same file
3. Run `npm run mcpb:build` and reinstall the extension

---

## 13. Environment Variables

The MCP server uses the same `.env` file as the REST API with the following MCP-specific variables:

| Variable | Default | Description |
|---|---|---|
| `MCP_TRANSPORT` | `streamable-http` | Transport to run: `"streamable-http"` (production standard) or `"stdio"`. |
| `MCP_PORT` | `3001` | Port on which the standalone Streamable HTTP server listens. |
| `MCP_HOST` | `127.0.0.1` | Host address to bind (`127.0.0.1` or `0.0.0.0`). When localhost, DNS rebinding protection is active. |
| `MCP_ENDPOINT` | `/mcp` | Path prefix for MCP JSON-RPC and SSE communication. |
| `MCP_MAX_SESSIONS` | `1000` | Maximum number of concurrent active client sessions before returning 503. |
| `MCP_SESSION_IDLE_TIMEOUT_MS` | `1800000` (30m) | Inactivity timeout after which idle sessions without open streams are evicted. |
| `MCP_ALLOWED_HOSTS` | auto | Comma-separated list of allowed HTTP Host headers for DNS rebinding protection. |
| `MCP_ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed CORS origins. |
| `MCP_ACCESS_TOKEN` | (none) | Pre-minted JWT that the server uses when no per-request Bearer token or header is supplied. |
| `MCP_STRICT_AUTH` | `false` | When `true`, rejects unauthenticated HTTP requests with 401. |

All other required variables (`DB_URL`, `ACCESS_TOKEN`, `REDIS_HOST`, etc.) are shared with the REST API and documented in [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).
