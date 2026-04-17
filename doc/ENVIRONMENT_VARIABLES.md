# Environment Variables

This project validates environment variables using Zod in `src/config/env.config.ts`. 
The app fails fast on invalid or missing values.

## Required Variables

- `PORT` - API port (default: `3000`)
- `NODE_ENV` - one of `development`, `production`, `test`
- `DB_URL` - MongoDB connection string
- `ACCESS_TOKEN` - JWT access token secret (minimum length: 32)
- `REFRESH_TOKEN` - JWT refresh token secret (minimum length: 32)
- `LOGIN_FAILURE_COUNT` - login failure threshold before lock
- `LOCK_UNTIL_TIME` - account lock time in minutes
- `REDIS_URL` - Redis connection string
- `LOGIN_BUCKET_CAPACITY` - login limiter token capacity
- `LOGIN_BUCKET_REFILLRATE` - login limiter refill rate
- `GLOBAL_BUCKET_CAPACITY` - global limiter token capacity
- `GLOBAL_BUCKET_REFILLRATE` - global limiter refill rate
- `MAX_SLUG_LENGTH` - maximum generated slug length
- `SMTP_HOST` - SMTP host
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `EMAIL_FROM` - sender identity
- `FRONTEND_URL` - frontend base URL (must be a valid URL)
- `CORS_ORGINS` - comma-separated allowlist of origins
- `LOG_LEVEL` - logger level (example: `info`)

## Example

Use `.env.example` as the base template.