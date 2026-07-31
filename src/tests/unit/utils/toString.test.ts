import { str } from "../../../utils/toString";

describe("str", () => {
  it("should return string value", () => {
    expect(str("hello")).toBe("hello");
  });

  it("should return first string from array", () => {
    expect(str(["hello", "world"])).toBe("hello");
  });

  it("should return empty string for number", () => {
    expect(str(123)).toBe("");
  });

  it("should return empty string for object", () => {
    expect(str({})).toBe("");
  });

  it("should return empty string for empty array", () => {
    expect(str([])).toBe("");
  });

  it("should return empty string when first array element is not string", () => {
    expect(str([123, "abc"])).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(str(undefined)).toBe("");
  });

  it("should return empty string for null", () => {
    expect(str(null)).toBe("");
  });
});
