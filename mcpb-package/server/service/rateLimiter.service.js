"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const redis_config_1 = require("../config/redis.config");
const luaScript = `
local key = KEYS[1]

local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local tokens = tonumber(redis.call("HGET", key, "tokens")) or capacity
local lastRefill = tonumber(redis.call("HGET", key, "lastRefill")) or now

local elapsed = (now - lastRefill) / 1000
local refill = elapsed * refillRate

tokens = math.min(capacity, tokens + refill)

if tokens < 1 then
    return {0, tokens}
end

tokens = tokens - 1

redis.call("HSET", key,
    "tokens", tokens,
    "lastRefill", now
)

redis.call("EXPIRE", key, 3600)

return {1, tokens}
`;
let cachedSha = null;
let loadingSha = null;
const loadScript = () => {
    if (!loadingSha) {
        loadingSha = redis_config_1.redisClient.script("LOAD", luaScript)
            .then((sha) => {
            cachedSha = sha;
            return sha;
        })
            .finally(() => {
            loadingSha = null;
        });
    }
    return loadingSha;
};
const isNoScriptError = (err) => err instanceof Error && err.message.includes("NOSCRIPT");
const createRateLimiter = (capacity, refillRate) => {
    const run = (sha, key, now) => redis_config_1.redisClient.evalsha(sha, 1, key, capacity.toString(), refillRate.toString(), now.toString());
    const consume = async (key) => {
        const now = Date.now();
        const sha = cachedSha ?? (await loadScript());
        let result;
        try {
            result = await run(sha, key, now);
        }
        catch (err) {
            if (!isNoScriptError(err))
                throw err;
            cachedSha = null;
            const freshSha = await loadScript();
            result = await run(freshSha, key, now);
        }
        return {
            allowed: result[0] === 1,
            tokens: result[1],
        };
    };
    return { consume };
};
exports.createRateLimiter = createRateLimiter;
