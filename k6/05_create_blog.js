/**
 * Benchmark 5 — POST /api/v1/blog  (authenticated)
 *
 * Covers: Authentication (JWT verify + Authorize middleware) ·
 *         Zod validation · generateUniqueSlug util (async regex DB query) ·
 *         Write to MongoDB (Blog.create) ·
 *         Redis cache invalidation (KEYS allBlog:* + KEYS allPopularBlog:* + DEL)
 *
 * What to watch:
 *   - This is your most expensive write. The KEYS pattern scan on Redis
 *     is an O(N) operation — it blocks Redis while scanning all keys.
 *     Under sustained write load you will see Redis latency climb.
 *     This benchmark directly exposes that anti-pattern.
 *   - generateUniqueSlug does a regex query against MongoDB to find
 *     collisions. Under concurrent blog creation with similar headings,
 *     this can cause contention. Watch MongoDB slow query logs.
 *   - Each VU needs its own valid accessToken, so setup() does a login
 *     and shares the token across the test via shared data.
 *
 * Run:
 *   npm run bench k6/05_create_blog.js
 *   npm run bench -- --out json=results/05_create.json k6/05_create_blog.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, USER_EMAIL, USER_PASSWORD, STAGES, THRESHOLDS } from "./config.js";

const createLatency = new Trend("create_duration_ms", true);
const createErrors  = new Rate("create_error_rate");

export const options = {
  stages: STAGES,
  thresholds: {
    ...THRESHOLDS,
    create_duration_ms: ["p(95)<1500"],  // writes + slug + cache bust
    create_error_rate:  ["rate<0.02"],   // slightly more lenient for writes
  },
};

// setup() runs once before any VUs start.
// It logs in and returns the accessToken for all VUs to share.
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/user/login`,
    JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (loginRes.status !== 202) {
    throw new Error(`Login failed in setup: ${loginRes.status} — ${loginRes.body}`);
  }

  const accessToken = JSON.parse(loginRes.body).access;
  return { accessToken };
}

// Words pool for generating unique headings per iteration
const WORDS = [
  "guide", "tutorial", "intro", "deep", "dive", "advanced", "practical",
  "modern", "fast", "scalable", "production", "tips", "patterns", "tricks",
  "redis", "mongodb", "node", "typescript", "docker", "kubernetes", "aws",
];

function randomHeading() {
  const pick = (n) =>
    Array.from({ length: n }, () => WORDS[Math.floor(Math.random() * WORDS.length)]);
  return pick(6).join(" ") + " " + Date.now();
}

export default function ({ accessToken }) {
  const payload = JSON.stringify({
    heading: randomHeading(),
    content: "Benchmark blog content. ".repeat(20),   // ~440 chars, above min
    tags:     ["benchmark", "k6"],
    category: ["Tutorial"],
    status:   "published",
  });

  const res = http.post(
    `${BASE_URL}/api/v1/blog`,
    payload,
    {
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      tags: { type: "write", endpoint: "create_blog" },
    },
  );

  const ok = check(res, {
    "create: status 201":    (r) => r.status === 201,
    "create: has blog id":   (r) => {
      try { return !!JSON.parse(r.body).data?.id; }
      catch { return false; }
    },
    "create: has slug":      (r) => {
      try { return !!JSON.parse(r.body).data?.slug; }
      catch { return false; }
    },
  });

  createLatency.add(res.timings.duration);
  createErrors.add(!ok);

  sleep(1);
}
