# Architecture

## Overview

This backend follows a layered architecture for each module:

- Controller: parses request/response and delegates business logic
- Service: core business rules and orchestration
- Repository: database persistence operations
- Model: Mongoose schema and indexes

## High-Level Flow

1. Request enters Express app (`src/app.ts`)
2. Middleware executes (logger, security, parsing, rate limiting, auth/csrf)
3. Route dispatches to module controller via `src/router/index.ts`
4. Controller validates input and calls service
5. Service coordinates repository, cache, and queue operations
6. Repository reads/writes MongoDB via Mongoose
7. Response returns through global error middleware

## Core Components

### App and Bootstrap

- `src/app.ts`: middleware stack and route mounting
- `src/server.ts`: DB connection + HTTP server start + signal listeners
- `src/config/shutdown.ts`: graceful shutdown for server, Mongo, and Redis

### Security and Middleware

- `src/middleware/auth.middleware.ts`: bearer token auth + role authorization
- `src/middleware/validateCsrf.ts`: csrf validation for session-sensitive actions
- `src/middleware/global.rateLimiter.ts`: global token bucket limiter
- `src/middleware/login.rateLimiter.ts`: stricter auth limiter
- `src/middleware/error.middleware.ts`: centralized error handling

#### Token Generation Strategy

Refresh and CSRF tokens are generated using Node's built-in `crypto.randomBytes` and stored as **HMAC-SHA256 hashes** (keyed with `HASH_TOKEN` env secret) via `src/utils/generateToken.ts`. Verification uses `crypto.timingSafeEqual` to prevent timing attacks.

This replaces a previous bcrypt-based approach. The change removes the intentional bcrypt work-factor cost from the hot login path, dropping the login endpoint P95 from ~3 s to ~376 ms while keeping stored values non-reversible.

### Domain Modules

- `Admin`: admin auth, account management, password lifecycle
- `User`: user auth, verification, account management
- `Blog`: CRUD, search, likes, views, report, popularity
- `Comment`: comment lifecycle and blog comment linking
- `Token`: invite/reset/verify token workflows
- `Notification`: email templates + sending logic
- `Logger`: structured log persistence endpoints

### Async Processing (BullMQ)

- Queue config: `src/config/queue.config.ts`
- Queue contracts: `src/queues/*.ts`
- Workers: `src/queues/workers/*.ts`

Workers run as independent processes and are required in production.

### Data Stores

- MongoDB: primary transactional data store
- Redis: rate limit state, cache layer, and BullMQ backend

## Runtime Concerns

- API and workers must be deployed as separate process groups
- Cached blog listing keys are invalidated on mutations
- Background jobs handle delayed/retry-safe operations
- `/health` checks key dependency health indicators

### Pagination Design

List endpoints (`/blog`, `/blog/search`, `/comments`) use **cursor-style boolean pagination** instead of a `total` count. The repository fetches `limit + 1` documents; if the extra row exists it sets `hasNextPage: true` and trims the result to `limit`. This eliminates the concurrent `countDocuments` aggregation query that was the primary bottleneck at scale (930 ms avg → 11–50 ms at 1 000 documents depending on cache state).

Paginated response envelope:

```json
{
  "data": [...],
  "page": 1,
  "limit": 10,
  "hasNextPage": true,
  "hasPrevPage": false
}
```
