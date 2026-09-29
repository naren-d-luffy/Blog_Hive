import type { Cursor } from "../../types/cursor.types";
import AppError from "../AppError";

const encodeCursor = function (cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
};

const decodeCursor = function (cursor: string): Cursor {
  try {
    const decode = Buffer.from(cursor, "base64").toString("utf-8");

    const parsed = JSON.parse(decode);

    if (!parsed.createdAt || !parsed.id) {
      throw new AppError("Invalid Cursor", 400);
    }
    return parsed;
  } catch (error) {
    throw new AppError("Invalid Cursor", 400);
  }
};

export {encodeCursor, decodeCursor};