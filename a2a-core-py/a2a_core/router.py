"""FastAPI router factory for A2A endpoints."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from .json_rpc import (
    JSON_RPC_ERRORS,
    make_json_rpc_error_response,
    make_json_rpc_response,
    parse_json_rpc_request,
)
from .models import (
    AgentCard,
    Artifact,
    Message,
    TaskCancelParams,
    TaskGetParams,
    TaskSendParams,
    TaskStatus,
    TextPart,
)
from .task_store import TaskStore

logger = logging.getLogger(__name__)


class TaskSendResult:
    """Return type from a task/send handler."""

    def __init__(
        self,
        artifacts: list[Artifact],
        agent_message: Message | None = None,
    ):
        self.artifacts = artifacts
        self.agent_message = agent_message


TaskSendHandler = Callable[[TaskSendParams], Awaitable[TaskSendResult]]


def create_a2a_router(
    agent_card: AgentCard,
    on_task_send: TaskSendHandler,
    task_store: TaskStore | None = None,
) -> APIRouter:
    """Create a FastAPI APIRouter with A2A endpoints.

    Adds:
      GET  /.well-known/agent.json  — serves the agent card
      POST /a2a                     — JSON-RPC 2.0 dispatcher
    """
    router = APIRouter()
    store = task_store or TaskStore()

    @router.get("/.well-known/agent.json")
    async def get_agent_card() -> dict[str, Any]:
        return agent_card.model_dump(exclude_none=True)

    @router.post("/a2a")
    async def a2a_endpoint(request: Request) -> JSONResponse:
        try:
            body = await request.json()
        except Exception:
            resp = make_json_rpc_error_response(None, JSON_RPC_ERRORS["PARSE_ERROR"])
            return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)

        try:
            rpc_request = parse_json_rpc_request(body)
        except ValueError as e:
            resp = make_json_rpc_error_response(
                body.get("id") if isinstance(body, dict) else None,
                JSON_RPC_ERRORS["INVALID_REQUEST"],
                str(e),
            )
            return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)

        rpc_id = rpc_request.id
        method = rpc_request.method
        params = rpc_request.params or {}

        if method == "tasks/send":
            return await _handle_task_send(rpc_id, params, store, on_task_send)
        elif method == "tasks/get":
            return _handle_task_get(rpc_id, params, store)
        elif method == "tasks/cancel":
            return _handle_task_cancel(rpc_id, params, store)
        else:
            resp = make_json_rpc_error_response(rpc_id, JSON_RPC_ERRORS["METHOD_NOT_FOUND"])
            return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)

    return router


# ── Internal handlers ─────────────────────────────────────────────────────────

async def _handle_task_send(
    rpc_id: str | int,
    params: dict[str, Any],
    store: TaskStore,
    handler: TaskSendHandler,
) -> JSONResponse:
    try:
        send_params = TaskSendParams(**params)
    except Exception as e:
        resp = make_json_rpc_error_response(
            rpc_id, JSON_RPC_ERRORS["INVALID_PARAMS"], str(e)
        )
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)

    try:
        # Create or reuse task
        existing = store.get(send_params.id)
        if not existing:
            store.create(send_params.id, send_params.sessionId, send_params.metadata)

        store.add_message(send_params.id, send_params.message)
        store.update_status(send_params.id, TaskStatus.WORKING)

        result = await handler(send_params)

        for artifact in result.artifacts:
            store.add_artifact(send_params.id, artifact)

        store.update_status(
            send_params.id, TaskStatus.COMPLETED, result.agent_message
        )

        task = store.get(send_params.id)
        resp = make_json_rpc_response(rpc_id, task.model_dump(exclude_none=True) if task else None)
        return JSONResponse(resp.model_dump(exclude_none=True))

    except Exception as e:
        logger.exception("Task %s failed", send_params.id)
        try:
            store.update_status(
                send_params.id,
                TaskStatus.FAILED,
                Message(role="agent", parts=[TextPart(text=str(e))]),
            )
        except Exception:
            pass
        resp = make_json_rpc_error_response(
            rpc_id, JSON_RPC_ERRORS["INTERNAL_ERROR"], str(e)
        )
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=500)


def _handle_task_get(
    rpc_id: str | int,
    params: dict[str, Any],
    store: TaskStore,
) -> JSONResponse:
    try:
        get_params = TaskGetParams(**params)
    except Exception as e:
        resp = make_json_rpc_error_response(
            rpc_id, JSON_RPC_ERRORS["INVALID_PARAMS"], str(e)
        )
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)

    task = store.get(get_params.id)
    if not task:
        resp = make_json_rpc_error_response(rpc_id, JSON_RPC_ERRORS["TASK_NOT_FOUND"])
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=404)

    resp = make_json_rpc_response(rpc_id, task.model_dump(exclude_none=True))
    return JSONResponse(resp.model_dump(exclude_none=True))


def _handle_task_cancel(
    rpc_id: str | int,
    params: dict[str, Any],
    store: TaskStore,
) -> JSONResponse:
    try:
        cancel_params = TaskCancelParams(**params)
    except Exception as e:
        resp = make_json_rpc_error_response(
            rpc_id, JSON_RPC_ERRORS["INVALID_PARAMS"], str(e)
        )
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)

    task = store.get(cancel_params.id)
    if not task:
        resp = make_json_rpc_error_response(rpc_id, JSON_RPC_ERRORS["TASK_NOT_FOUND"])
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=404)

    try:
        store.cancel(cancel_params.id)
        updated = store.get(cancel_params.id)
        resp = make_json_rpc_response(rpc_id, updated.model_dump(exclude_none=True) if updated else None)
        return JSONResponse(resp.model_dump(exclude_none=True))
    except ValueError:
        resp = make_json_rpc_error_response(
            rpc_id,
            JSON_RPC_ERRORS["TASK_NOT_CANCELABLE"],
            f"Task is in {task.status.status.value} state",
        )
        return JSONResponse(resp.model_dump(exclude_none=True), status_code=400)
