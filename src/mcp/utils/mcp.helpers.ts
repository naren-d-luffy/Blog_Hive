import AppError from "../../utils/AppError";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface McpSuccessPayload<T = unknown> {
  success: true;
  statusCode: number;
  data: T;
}

export interface McpErrorPayload {
  success: false;
  statusCode: number;
  error: string;
  details?: unknown;
}

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ─── Resource types ───────────────────────────────────────────────────────────

/**
 * The shape returned by every resource read handler.
 * MCP resources respond with an array of content items; we use a single JSON blob
 * to stay consistent with the tool helpers.
 *
 * The index signature `[x: string]: unknown` is required to satisfy the SDK's
 * `ReadResourceResult` type.
 */
export interface McpResourceResult {
  [x: string]: unknown;
  contents: Array<{
    uri: string;
    mimeType: "application/json";
    text: string;
  }>;
}

// ─── Tool formatters ──────────────────────────────────────────────────────────

export function formatToolSuccess<T>(data: T, statusCode = 200): McpToolResult {
  const payload: McpSuccessPayload<T> = {
    success: true,
    statusCode,
    data,
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function formatToolError(err: unknown): McpToolResult {
  let statusCode = 500;
  let message = "An unexpected internal server error occurred";
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message;
  }

  const payload: McpErrorPayload = {
    success: false,
    statusCode,
    error: message,
    ...(details !== undefined && { details }),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: true,
  };
}

// ─── Resource formatters ──────────────────────────────────────────────────────

/**
 * Wraps a successful resource payload in the MCP resource content envelope.
 *
 * @param uri       - The canonical URI of the resource (echoed back in the response)
 * @param data      - Any serialisable data to embed as JSON
 * @param statusCode - Logical HTTP-style status (default 200)
 */
export function formatResourceSuccess<T>(
  uri: string,
  data: T,
  statusCode = 200,
): McpResourceResult {
  const payload: McpSuccessPayload<T> = { success: true, statusCode, data };
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

/**
 * Wraps an error in the MCP resource content envelope.
 * Resources do NOT have an `isError` flag – errors are surfaced via the payload.
 */
export function formatResourceError(uri: string, err: unknown): McpResourceResult {
  let statusCode = 500;
  let message = "An unexpected internal server error occurred";
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    message = err.message;
  }

  const payload: McpErrorPayload = {
    success: false,
    statusCode,
    error: message,
    ...(details !== undefined && { details }),
  };

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}
