"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_mock_1 = __importDefault(require("ioredis-mock"));
const redis = new ioredis_mock_1.default();
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
