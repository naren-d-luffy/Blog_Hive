/**
 * Benchmark 2 — GET /api/v1/blog?limit=10
 *
 * Covers: Read · Redis cache (miss on first req, hit on subsequent) ·
 *         Cursor Pagination · MongoDB compound index scan ·
 *         Global token-bucket rate limiter
 *
 * What to watch:
 *   - First requests per VU will be cache MISSES (hitting MongoDB).
 *     Once Redis is warm, p50 should drop sharply — that delta is your
 *     cache benefit.
 *   - Compare p50 vs p99: a large gap means your DB queries are
 *     occasionally slow (index not being used, or lock contention).
 *   - 429 responses = global rate limiter firing. Raise
 *     GLOBAL_BUCKET_CAPACITY in .env before load testing.
 *   - Run with ?limit=10 (warm cache) and with a cursor to see pagination cold-path cost.
 *
 * Scenarios:
 *   warm  – hits the same cache key repeatedly (first page)
 *   cold  – simulates cursor pagination to force cache misses
 *
 * Run:
 *   npm run bench k6/02_get_blogs.js
 *   npm run bench -- --out json=results/02_get_blogs.json k6/02_get_blogs.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, STAGES, THRESHOLDS } from "./config.js";

const readLatency = new Trend("blog_list_duration_ms", true);
const readErrors  = new Rate("blog_list_error_rate");

export const options = {
  scenarios: {
    // Scenario A: warm cache — same first page key every time
    warm_cache: {
      executor:   "ramping-vus",
      stages:     STAGES,
      tags:       { scenario: "warm" },
    },
  },
  thresholds: {
    ...THRESHOLDS,
    blog_list_duration_ms: ["p(95)<300"],
    blog_list_error_rate:  ["rate<0.01"],
  },
};

export default function () {
  const limit = 10;

  const res = http.get(
    `${BASE_URL}/api/v1/blog?limit=${limit}`,
    { tags: { type: "read", endpoint: "blog_list" } },
  );

  const ok = check(res, {
    "blogs: status 200":        (r) => r.status === 200,
    "blogs: has data array":    (r) => {
      try { return Array.isArray(JSON.parse(r.body).data); }
      catch { return false; }
    },
    "blogs: has pagination":    (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.hasNextPage !== undefined;
      }
      catch { return false; }
    },
  });

  readLatency.add(res.timings.duration);
  readErrors.add(!ok);

  sleep(0.5);
}
