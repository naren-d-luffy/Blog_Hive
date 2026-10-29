import { Request } from "express";
import { str } from "../toString";

function parseCursorPagination(query: Request["query"]): {
  cursor?: string;
  limit: number;
} {
  const requestedLimit = parseInt(str(query.limit) || "10", 10) || 10;

  const limit = Math.min(100, Math.max(1, requestedLimit));

  const cursor = query.cursor ? str(query.cursor) : undefined;

  return {
    limit,
    cursor,
  };
}

export default parseCursorPagination;
