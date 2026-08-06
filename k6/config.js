// ─── Shared config for all benchmark scripts ───────────────────────────────
// Edit BASE_URL and credentials here before running any script.

export const BASE_URL = "http://localhost:5000";

export const USER_EMAIL    = "user0@example.com";   // seeded user
export const USER_PASSWORD = "Password1";            // default seeded password

// Standard ramp-up/hold/ramp-down stages used across all scripts.
// Tweak VUs here to match your machine capacity.
export const STAGES = [
  { duration: "30s", target: 20  },  // ramp up
  { duration: "1m",  target: 20  },  // hold (warm cache, steady state)
  { duration: "30s", target: 50  },  // stress
  { duration: "1m",  target: 50  },  // hold under stress
  { duration: "20s", target: 0   },  // ramp down
];

// Pass/fail thresholds shared by all scripts.
export const THRESHOLDS = {
  http_req_failed:                ["rate<0.01"],       // <1% errors
  http_req_duration:              ["p(95)<500"],       // 95th pct under 500ms
  "http_req_duration{type:read}": ["p(95)<300"],       // reads stricter
  "http_req_duration{type:write}":["p(95)<800"],       // writes more lenient
};
