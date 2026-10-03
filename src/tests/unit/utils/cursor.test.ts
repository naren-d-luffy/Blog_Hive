import { encodeCursor, decodeCursor } from "../../../utils/Cursor/cursor";
import AppError from "../../../utils/AppError";

describe("Cursor encode and decode", () => {
  it("should encode and decode a valid cursor with createdAt and id", () => {
    const cursorObj = {
      createdAt: "2026-10-03T10:00:00.000Z",
      id: "6703cc226a27e029c9ef6bc1",
    };

    const encoded = encodeCursor(cursorObj);
    expect(typeof encoded).toBe("string");

    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(cursorObj);
  });

  it("should encode and decode cursor with popularityScore", () => {
    const cursorObj = {
      createdAt: "2026-10-03T10:00:00.000Z",
      id: "6703cc226a27e029c9ef6bc1",
      popularityScore: 42.5,
    };

    const encoded = encodeCursor(cursorObj);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(cursorObj);
  });

  it("should throw AppError when decoding invalid base64", () => {
    expect(() => decodeCursor("invalid-base64-string!@#$")).toThrow(AppError);
  });

  it("should throw AppError when cursor is missing createdAt or id", () => {
    const missingId = Buffer.from(JSON.stringify({ createdAt: "2026-10-03T10:00:00.000Z" })).toString("base64");
    expect(() => decodeCursor(missingId)).toThrow(AppError);

    const missingCreatedAt = Buffer.from(JSON.stringify({ id: "123" })).toString("base64");
    expect(() => decodeCursor(missingCreatedAt)).toThrow(AppError);
  });

  it("should throw AppError when createdAt is not a valid date string", () => {
    const invalidDate = Buffer.from(JSON.stringify({ createdAt: "not-a-date", id: "123" })).toString("base64");
    expect(() => decodeCursor(invalidDate)).toThrow(AppError);
  });
});
