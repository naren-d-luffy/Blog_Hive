# Blog Backend

Production-focused backend for a blog platform built with Node.js, Express, TypeScript, MongoDB, Redis, and BullMQ.

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
- CSRF protection on refresh/logout
- Redis-backed token bucket rate limiting
- Blog caching and popularity scoring
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

## API Documentation

- Postman collection: `doc/Blog Backend.postman_collection.json`

## Health Endpoint

- `GET /health` returns runtime health data for MongoDB, Redis, uptime, and memory usage.

## Additional Documentation

- Architecture: `doc/ARCHITECTURE.md`
- Environment variables: `doc/ENVIRONMENT_VARIABLES.md`
- API guide: `doc/API_GUIDE.md`
- Production runbook: `doc/PRODUCTION_RUNBOOK.md`