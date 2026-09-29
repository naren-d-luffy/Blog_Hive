import { Request } from "express";
import { str } from "../toString";

function parseCursorPagination(query: Request["query"]): {
  cursor?: string;
  limit: number;
} {
  const limit = Math.min(100, parseInt(str(query.limit) || "10", 10) || 10);
  const cursor = query.cursor ? str(query.cursor) : undefined;

  return { limit, cursor };
}

export default parseCursorPagination;
