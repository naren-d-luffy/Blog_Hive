import Redis from "ioredis-mock";

const redis = new Redis();

jest.mock("../../config/redis.config", () => ({
    __esModule: true,
    redisClient: redis,
    default: redis,
    connectRedis: jest.fn(),
}));


beforeEach(async () => {
    await redis.flushall();
});

afterAll(async () => {
    redis.disconnect();
});