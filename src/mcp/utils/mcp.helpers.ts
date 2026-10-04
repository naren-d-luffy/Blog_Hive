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

// ─── Formatters ───────────────────────────────────────────────────────────────

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
