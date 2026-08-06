/**
 * Benchmark 4 — POST /api/v1/blog/:id/view
 *
 * Covers: Write · Redis dedup key (SET with EX 600) · BullMQ job enqueue
 *         (UPDATE_POPULARITY) · MongoDB $inc · No auth required
 *
 * What to watch:
 *   - This is your highest-frequency write in production.
 *     Every page load by every visitor hits it.
 *   - The current code does blogRepository.findById BEFORE checking the
 *     Redis dedup key — that's an extra MongoDB read even when the view
 *     won't be counted. This benchmark will quantify that cost.
 *   - Watch BullMQ queue depth (redis-cli LLEN bull:blog-queue:wait) while
 *     this runs. If workers can't consume fast enough, depth grows.
 *   - Redis dedup TTL is 600s. Use different blog IDs to bypass dedup and
 *     stress the full write path (DB + queue). Use the SAME ID repeatedly
 *     to measure the Redis-only hot path.
 *
 * Setup:
 *   Run `npm run seed` first to generate blogs.json, then import the IDs
 *   into MongoDB. The BLOG_IDS array below should contain real ObjectIds
 *   from your seeded data.
 *
 * Run:
 *   npm run bench k6/04_track_view.js
 *   npm run bench -- --out json=results/04_view.json k6/04_track_view.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, STAGES, THRESHOLDS } from "./config.js";

const viewLatency = new Trend("view_duration_ms", true);
const viewErrors  = new Rate("view_error_rate");

// ─── Replace with real ObjectIds from your seeded DB ─────────────────────────
// You can get them with:
//   mongosh your-db --eval "db.blogs.find({},{_id:1}).limit(20).toArray()"
// Then paste the IDs below.
const BLOG_IDS = [
  "REPLACE_WITH_REAL_OBJECTID_1",
  "REPLACE_WITH_REAL_OBJECTID_2",
  "REPLACE_WITH_REAL_OBJECTID_3",
  "REPLACE_WITH_REAL_OBJECTID_4",
  "REPLACE_WITH_REAL_OBJECTID_5",
];
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  stages: STAGES,
  thresholds: {
    ...THRESHOLDS,
    view_duration_ms: ["p(95)<400"],
    view_error_rate:  ["rate<0.01"],
  },
};

export default function () {
  // Rotate IDs to bypass the Redis dedup key and hit the full write path.
  // Use a single ID to measure the Redis-only fast path.
  const id = BLOG_IDS[Math.floor(Math.random() * BLOG_IDS.length)];

  const res = http.post(
    `${BASE_URL}/api/v1/blog/${id}/view`,
    null,
    { tags: { type: "write", endpoint: "track_view" } },
  );

  const ok = check(res, {
    "view: status 200":      (r) => r.status === 200,
    "view: has counted key": (r) => {
      try { return JSON.parse(r.body).data !== undefined; }
      catch { return false; }
    },
  });

  viewLatency.add(res.timings.duration);
  viewErrors.add(!ok);

  sleep(0.3);
}
