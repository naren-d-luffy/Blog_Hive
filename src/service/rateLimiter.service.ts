import redis from "../config/redis.config";

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

let cachedSha: string | null = null;

export const createRateLimiter = (capacity: number, refillRate: number) => {
  const consume = async (key: string) => {
    const now = Date.now();

    if (!cachedSha) {
      cachedSha = await redis.script("LOAD", luaScript) as string;
    }

    const result = await redis.evalsha(
      cachedSha,
      1,
      key,
      capacity.toString(),
      refillRate.toString(),
      now.toString()
    ) as [number, number];

    return {
      allowed: result[0] === 1,
      tokens: result[1],
    };
  };

  return { consume };
};