/**
 * Benchmark 1 — POST /api/v1/user/login
 *
 * Covers: Authentication · bcrypt · login rate limiter (token-bucket Lua)
 *         JWT sign · CSRF hash · DB write (refreshToken + csrfToken)
 *
 * What to watch:
 *   - Latency climbs with VUs because bcrypt is CPU-bound (cost=10 means
 *     ~100ms per hash on a typical CPU). Under concurrent load you will
 *     see the Node.js event loop queue up.
 *   - 429 responses = login rate-limiter firing. Tune LOGIN_BUCKET_CAPACITY
 *     in .env to raise the threshold for benchmarking.
 *   - http_req_duration p99 gives you the worst-case auth cost.
 *
 * Run:
 *   npm run bench k6/01_login.js
 *   npm run bench -- --out json=results/01_login.json k6/01_login.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, USER_EMAIL, USER_PASSWORD, STAGES, THRESHOLDS } from "./config.js";

// Custom metrics so results are easy to compare across runs
const loginLatency = new Trend("login_duration_ms", true);
const loginErrors  = new Rate("login_error_rate");

export const options = {
  stages: STAGES,
  thresholds: {
    ...THRESHOLDS,
    login_duration_ms: ["p(95)<1000"],  // login-specific threshold
    login_error_rate:  ["rate<0.01"],
  },
};

export default function () {
  const payload = JSON.stringify({
    email:    USER_EMAIL,
    password: USER_PASSWORD,
  });

  const params = {
    headers: { "Content-Type": "application/json" },
    tags:    { type: "write", endpoint: "login" },
  };

  const res = http.post(`${BASE_URL}/api/v1/user/login`, payload, params);

  const ok = check(res, {
    "login: status 202":          (r) => r.status === 202,
    "login: has accessToken":     (r) => {
      try { return !!JSON.parse(r.body).access; }
      catch { return false; }
    },
    "login: sets refreshToken cookie": (r) =>
      r.cookies["refreshToken"] !== undefined,
  });

  loginLatency.add(res.timings.duration);
  loginErrors.add(!ok);

  sleep(1);
}
