import type { Cursor } from "../../types/cursor.types";
import AppError from "../AppError";

const encodeCursor = (cursor: Cursor): string => {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
};

const decodeCursor = (cursor: string): Cursor => {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");

    const parsed = JSON.parse(decoded);

    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string" ||
      !parsed.createdAt ||
      !parsed.id
    ) {
      throw new AppError("Invalid Cursor", 400);
    }

    if (Number.isNaN(Date.parse(parsed.createdAt))) {
      throw new AppError("Invalid Cursor", 400);
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
      ...(typeof parsed.popularityScore === "number" && {
        popularityScore: parsed.popularityScore,
      }),
    };
  } catch {
    throw new AppError("Invalid Cursor", 400);
  }
};

export { encodeCursor, decodeCursor };
