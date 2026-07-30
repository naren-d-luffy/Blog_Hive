import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ["<rootDir>/src/tests"],

  testMatch: [
    "**/src/tests/unit/**/*.test.ts",
    "**/src/tests/integration/**/*.test.ts",
    "**/src/tests/e2e/**/*.test.ts",
  ],

  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
  ],

  coverageDirectory: "coverage",
  setupFilesAfterEnv: [
    "<rootDir>/src/tests/setup/jest.setup.ts"
],
};

export default config;