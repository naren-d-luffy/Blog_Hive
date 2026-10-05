/**
 * Benchmark 3 — GET /api/v1/blog/search?q=<term>&page=1&limit=10
 *
 * Covers: Read · Redis cache (30s TTL, shorter than other endpoints) ·
 *         Pagination · MongoDB $text index with $meta textScore sort ·
 *         Zod query validation (min 2 chars enforced)
 *
 * What to watch:
 *   - MongoDB text search is heavier than a normal find+sort because of
 *     the relevance scoring pass. Compare p99 here vs benchmark 2.
 *   - The 30s TTL means cache entries expire more often than list/detail
 *     endpoints (60s). Under sustained load you'll see periodic spikes
 *     when a key expires and multiple VUs hit MongoDB simultaneously
 *     (thundering herd). This is a known gap worth measuring.
 *   - Rotate search terms to avoid all VUs hitting the same cache key,
 *     which would make results unrealistically fast.
 *
 * Run:
 *   npm run bench k6/03_search_blogs.js
 *   npm run bench -- --out json=results/03_search.json k6/03_search_blogs.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, STAGES, THRESHOLDS } from "./config.js";

const searchLatency = new Trend("search_duration_ms", true);
const searchErrors  = new Rate("search_error_rate");

// Mix of realistic search terms — short enough to exist in lorem ipsum content
const SEARCH_TERMS = [
  "node", "mongodb", "typescript", "react", "docker",
  "redis", "backend", "cloud", "devops", "tutorial",
];

export const options = {
  stages: STAGES,
  thresholds: {
    ...THRESHOLDS,
    search_duration_ms: ["p(95)<600"],
    search_error_rate:  ["rate<0.01"],
  },
};

export default function () {
  // Pick a random search term per iteration to stress the cache and DB
  const term  = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const page  = Math.floor(Math.random() * 3) + 1;
  const limit = 10;

  const res = http.get(
    `${BASE_URL}/api/v1/blog/search?q=${term}&page=${page}&limit=${limit}`,
    { tags: { type: "read", endpoint: "search" } },
  );

  const ok = check(res, {
    "search: status 200":       (r) => r.status === 200,
    "search: has data array":   (r) => {
      try { return Array.isArray(JSON.parse(r.body).data); }
      catch { return false; }
    },
    "search: query echoed back":(r) => {
      try { return JSON.parse(r.body).query === term; }
      catch { return false; }
    },
  });

  searchLatency.add(res.timings.duration);
  searchErrors.add(!ok);

  sleep(0.5);
}
