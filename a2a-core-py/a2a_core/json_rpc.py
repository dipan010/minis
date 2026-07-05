"""JSON-RPC 2.0 parsing and response helpers."""

from __future__ import annotations

from typing import Any

from .models import JsonRpcErrorObject, JsonRpcRequest, JsonRpcResponse


# ── Standard error codes ──────────────────────────────────────────────────────

JSON_RPC_ERRORS = {
    "PARSE_ERROR": {"code": -32700, "message": "Parse error"},
    "INVALID_REQUEST": {"code": -32600, "message": "Invalid Request"},
    "METHOD_NOT_FOUND": {"code": -32601, "message": "Method not found"},
    "INVALID_PARAMS": {"code": -32602, "message": "Invalid params"},
    "INTERNAL_ERROR": {"code": -32603, "message": "Internal error"},
    # A2A-specific
    "TASK_NOT_FOUND": {"code": -32001, "message": "Task not found"},
    "TASK_NOT_CANCELABLE": {"code": -32002, "message": "Task cannot be canceled"},
    "UNSUPPORTED_SKILL": {"code": -32003, "message": "Unsupported skill"},
}


# ── Request parsing ──────────────────────────────────────────────────────────

def parse_json_rpc_request(body: dict[str, Any]) -> JsonRpcRequest:
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object")

    if body.get("jsonrpc") != "2.0":
        raise ValueError('Missing or invalid "jsonrpc" field. Must be "2.0".')

    if not isinstance(body.get("method"), str) or len(body["method"]) == 0:
        raise ValueError('Missing or invalid "method" field.')

    if body.get("id") is None:
        raise ValueError('Missing "id" field.')

    return JsonRpcRequest(
        jsonrpc="2.0",
        id=body["id"],
        method=body["method"],
        params=body.get("params"),
    )


# ── Response builders ────────────────────────────────────────────────────────

def make_json_rpc_response(
    rpc_id: str | int | None,
    result: Any,
) -> JsonRpcResponse:
    return JsonRpcResponse(
        jsonrpc="2.0",
        id=rpc_id if rpc_id is not None else 0,
        result=result,
    )


def make_json_rpc_error_response(
    rpc_id: str | int | None,
    error: dict[str, Any],
    data: Any = None,
) -> JsonRpcResponse:
    return JsonRpcResponse(
        jsonrpc="2.0",
        id=rpc_id if rpc_id is not None else 0,
        error=JsonRpcErrorObject(
            code=error["code"],
            message=error["message"],
            data=data,
        ),
    )
