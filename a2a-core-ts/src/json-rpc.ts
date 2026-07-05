import { JsonRpcRequest, JsonRpcResponse, JsonRpcErrorObject } from "./types";

// ── Standard JSON-RPC 2.0 error codes ───────────────────────────────────────

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: "Parse error" },
  INVALID_REQUEST: { code: -32600, message: "Invalid Request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
  // A2A-specific error codes
  TASK_NOT_FOUND: { code: -32001, message: "Task not found" },
  TASK_NOT_CANCELABLE: { code: -32002, message: "Task cannot be canceled" },
  UNSUPPORTED_SKILL: { code: -32003, message: "Unsupported skill" },
} as const;

// ── Request parsing ──────────────────────────────────────────────────────────

export function parseJsonRpcRequest(body: unknown): JsonRpcRequest {
  if (!body || typeof body !== "object") {
    throw makeJsonRpcErrorResponse(null, JSON_RPC_ERRORS.PARSE_ERROR);
  }

  const obj = body as Record<string, unknown>;

  if (obj.jsonrpc !== "2.0") {
    throw makeJsonRpcErrorResponse(
      obj.id as string | number | null,
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Missing or invalid "jsonrpc" field. Must be "2.0".'
    );
  }

  if (typeof obj.method !== "string" || obj.method.length === 0) {
    throw makeJsonRpcErrorResponse(
      obj.id as string | number | null,
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Missing or invalid "method" field.'
    );
  }

  if (obj.id === undefined || obj.id === null) {
    throw makeJsonRpcErrorResponse(
      null,
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Missing "id" field.'
    );
  }

  return {
    jsonrpc: "2.0",
    id: obj.id as string | number,
    method: obj.method as string,
    params: (obj.params as Record<string, unknown>) ?? undefined,
  };
}

// ── Response builders ────────────────────────────────────────────────────────

export function makeJsonRpcResponse(
  id: string | number | null,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? 0,
    result,
  };
}

export function makeJsonRpcErrorResponse(
  id: string | number | null,
  error: { code: number; message: string },
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? 0,
    error: {
      code: error.code,
      message: error.message,
      data,
    },
  };
}
