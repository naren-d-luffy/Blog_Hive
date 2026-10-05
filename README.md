# Blog Hive

A production-ready, scalable blog backend built with Node.js, Express, TypeScript, MongoDB, Redis, and BullMQ.

## Tech Stack

- Node.js + TypeScript
- Express
- MongoDB (Mongoose)
- Redis (ioredis)
- BullMQ (async workers)
- Zod (request and env validation)
- Pino (structured logging)

## Features

- Layered architecture (`controller -> service -> repository -> model`)
- JWT-based auth with access + refresh token flow
- CSRF protection on refresh/logout — refresh and CSRF tokens are generated with Node's built-in `crypto.randomBytes` and stored as HMAC-SHA256 hashes (replacing bcrypt), reducing login P95 from ~3 s to ~376 ms
- Redis-backed token bucket rate limiting
- Blog caching and popularity scoring
- Cursor-style pagination (`hasNextPage` / `hasPrevPage`) — eliminates the concurrent `countDocuments` query, cutting list-endpoint latency significantly at scale
- Async queues for blog/email/log workloads
- Soft deletes and account lockout support

## Project Structure

- `src/app.ts` - Express app setup and middleware registration
- `src/server.ts` - app bootstrap and process signal handling
- `src/config/` - env, db, redis, queue, logger, shutdown
- `src/middleware/` - auth, rate limiting, csrf, error/logger middleware
- `src/modules/` - domain modules (Admin, User, Blog, Comment, Token, Logger, Notification)
- `src/queues/` - queue definitions and worker processes
- `src/router/` - main route aggregator
- `doc/` - API collection and operational documentation

```bash
/
├── doc/
│   ├── API_GUIDE.md
│   ├── ARCHITECTURE.md
│   ├── ENVIRONMENT_VARIABLES.md
│   └── PRODUCTION_RUNBOOK.md
│
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── middleware/
│   ├── modules/
│   │   ├── Admin/
│   │   ├── User/
│   │   ├── Blog/
│   │   ├── Comment/
│   │   ├── Notification/
│   │   └── Token/
│   ├── queues/
│   ├── router/
│   ├── service/
│   ├── types/
│   └── utils/
│
├── package.json
├── tsconfig.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
├── README.md
└── LICENSE
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

- Copy `.env.example` to `.env`
- Fill all required values (see `doc/ENVIRONMENT_VARIABLES.md`)

### 3. Start API server (development)

```bash
npm run dev
```

### 4 Start background workers (required for queues)

```bash
npm run worker
```

## Build and Run (Production)

```bash
npm run build
npm start
```

Start workers in separate processes:

```bash
npm run worker:blog
npm run worker:email
npm run worker:log
```

## Docker Support

Build and run with Docker:

```bash
docker build -t blog-back .
```
>Run Container

This project requires environment variables to run. Use the provided .env.example file.

```bash
docker run --env-file .env -p 5000:5000 blog-back
```

> Blog worker
```bash
docker run --env-file .env blog-back npm run worker:blog
```

> Email worker
```bash
docker run --env-file .env blog-back npm run worker:email
```

> Log worker
```bash
docker run --env-file .env blog-back npm run worker:log
```

## API Documentation

- Postman collection: `doc/Blog Backend.postman_collection.json`

## Health Endpoint

- `GET /health` returns runtime health data for MongoDB, Redis, uptime, and memory usage.

## Additional Documentation

- Architecture: `doc/ARCHITECTURE.md`
- Environment variables: `doc/ENVIRONMENT_VARIABLES.md`
- API guide: `doc/API_GUIDE.md`
- Production runbook: `doc/PRODUCTION_RUNBOOK.md`

## Performance

Load-tested with [k6](https://k6.io/) on a local machine. All runs recorded **0% error rate**.

| # | Endpoint | Dataset | Configuration | Avg | P95 | RPS |
|---|----------|---------|---------------|-----|-----|-----|
| 1 | `POST /api/v1/user/login` | 1 user | — | 187.8 ms | 376.25 ms | 25.48/s |
| 2 | `GET /api/v1/blog` | 100 blogs | Redis + Pagination | 14.63 ms | 34.88 ms | 58.43/s |
| 2 | `GET /api/v1/blog` | 100 blogs | No Redis + Pagination | 35.61 ms | 59.19 ms | 56.20/s |
| 2 | `GET /api/v1/blog` | 100 blogs | No Redis + No Pagination | 89.67 ms | 183.83 ms | 49.68/s |
| 2 | `GET /api/v1/blog` | 1 000 blogs | Redis + Pagination | 11.41 ms | 33.43 ms | 58.83/s |
| 2 | `GET /api/v1/blog` | 1 000 blogs | No Redis + Pagination | 49.66 ms | 522 ms | 66.06/s |
| 2 | `GET /api/v1/blog` | 1 000 blogs | No Redis + No Pagination | 930.01 ms | 1.94 s | 21.16/s |
| 3 | `GET /api/v1/blog/search` | 1 000 blogs | Redis + Pagination | 10.53 ms | 32.43 ms | 59.01/s |
| 4 | `GET /api/v1/blog/:id/view` | 5 blogs | Redis + BullMQ | 5 ms | 18.53 ms | 98.73/s |
| 4 | `GET /api/v1/blog/:id/view` | 5 blogs | No Redis + BullMQ | 4.48 ms | 19.06 ms | 98.86/s |
| 4 | `GET /api/v1/blog/:id/view` | 5 blogs | No Redis + No BullMQ | 2.1 ms | 7.37 ms | 99.8/s |
| 5 | `POST /api/v1/blog` | — | — | 84.89 ms | 139.98 ms | 27.77/s |

> K6 scripts are located in the `k6/` directory.

## Author
RamNaren

## License
This project is licensed under the MIT License.