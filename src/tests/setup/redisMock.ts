import Redis from "ioredis-mock";

const redis = new Redis();

jest.mock("../../config/redis.config", () => ({
    __esModule: true,
    default: redis,
}));

beforeEach(async () => {
    await redis.flushall();
});

afterAll(async () => {
    redis.disconnect();
});