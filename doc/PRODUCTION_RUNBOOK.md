# Production Runbook

Run API and workers as separate long-running processes:

- API: `npm start`
- Blog worker: `npm run worker:blog`
- Email worker: `npm run worker:email`
- Log worker: `npm run worker:log`

If your process manager supports groups, keep workers independent so one worker crash does not stop API traffic.

## Startup Order

1. Ensure MongoDB is reachable
2. Ensure Redis is reachable
3. Start API process
4. Start worker processes
5. Verify `GET /health` returns healthy status

## Health and Monitoring

- API health endpoint: `GET /health`
- Monitor:
  - 5xx rate and latency
  - auth failure spikes
  - queue lag and failed jobs
  - Redis reconnect frequency
  - Mongo connection stability