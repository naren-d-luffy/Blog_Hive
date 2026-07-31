import mongoose from "mongoose";
import AppError from "../../../utils/AppError";
import checkId from "../../../utils/CheckId";

describe("checkId", () => {
  it("should not throw for valid ObjectId", () => {
    const id = new mongoose.Types.ObjectId().toString();

    expect(() => checkId(id)).not.toThrow();
  });

  it("should throw AppError for invalid id", () => {
    expect(() => checkId("abc123")).toThrow(AppError);
  });

  it("should throw correct message", () => {
    expect(() => checkId("invalid")).toThrow("Invalid Id");
  });

  it("should throw for empty string", () => {
    expect(() => checkId("")).toThrow(AppError);
  });
});
