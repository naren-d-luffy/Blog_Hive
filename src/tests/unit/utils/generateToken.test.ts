import {generateToken} from "../../../utils/generateToken";
import AppError from "../../../utils/AppError";

describe("generateToken", () => {
  it("should generate a default token", () => {
    const token = generateToken();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should generate different tokens each time", () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).not.toBe(token2);
  });

  it("should generate hex encoded token", () => {
    const token = generateToken({
      length: 16,
      encoding: "hex",
    });

    expect(token).toMatch(/^[a-f0-9]+$/);
    expect(token.length).toBe(32);
  });

  it("should generate base64url token", () => {
    const token = generateToken({
      length: 16,
      encoding: "base64url",
    });

    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("should prepend prefix", () => {
    const token = generateToken({
      prefix: "verify_",
    });

    expect(token.startsWith("verify_")).toBe(true);
  });

  it("should throw when length <= 0", () => {
    expect(() => generateToken({ length: 0 })).toThrow(AppError);

    expect(() => generateToken({ length: -5 })).toThrow(
      "Token Length must be greater than 0",
    );
  });
});
