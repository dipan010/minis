"""A2A protocol Pydantic models — mirrors the A2A spec."""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field


# ── Message Parts ─────────────────────────────────────────────────────────────

class TextPart(BaseModel):
    type: Literal["text"] = "text"
    text: str
    metadata: dict[str, Any] | None = None


class FileContent(BaseModel):
    name: str | None = None
    mimeType: str | None = None
    bytes: str | None = None  # base64-encoded
    uri: str | None = None


class FilePart(BaseModel):
    type: Literal["file"] = "file"
    file: FileContent
    metadata: dict[str, Any] | None = None


class DataPart(BaseModel):
    type: Literal["data"] = "data"
    data: dict[str, Any]
    metadata: dict[str, Any] | None = None


Part = Annotated[Union[TextPart, FilePart, DataPart], Field(discriminator="type")]


# ── Messages & Artifacts ─────────────────────────────────────────────────────

class Message(BaseModel):
    role: Literal["user", "agent"]
    parts: list[Part]
    metadata: dict[str, Any] | None = None


class Artifact(BaseModel):
    name: str | None = None
    description: str | None = None
    parts: list[Part]
    index: int | None = None
    metadata: dict[str, Any] | None = None


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskStatus(str, Enum):
    SUBMITTED = "submitted"
    WORKING = "working"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class TaskState(BaseModel):
    status: TaskStatus
    message: Message | None = None
    timestamp: str | None = None


class Task(BaseModel):
    id: str
    sessionId: str | None = None
    status: TaskState
    messages: list[Message] = Field(default_factory=list)
    artifacts: list[Artifact] = Field(default_factory=list)
    metadata: dict[str, Any] | None = None


# ── Agent Card ────────────────────────────────────────────────────────────────

class AgentSkill(BaseModel):
    id: str
    name: str
    description: str
    tags: list[str] | None = None
    examples: list[str] | None = None
    inputModes: list[str] | None = None
    outputModes: list[str] | None = None


class AgentCapabilities(BaseModel):
    streaming: bool = False
    pushNotifications: bool = False
    stateTransitionHistory: bool = False


class AgentAuthentication(BaseModel):
    schemes: list[str] | None = None
    credentials: str | None = None


class AgentCard(BaseModel):
    name: str
    description: str
    url: str
    version: str
    capabilities: AgentCapabilities | None = None
    skills: list[AgentSkill]
    defaultInputModes: list[str] | None = Field(default_factory=lambda: ["text/plain"])
    defaultOutputModes: list[str] | None = Field(default_factory=lambda: ["application/json"])
    authentication: AgentAuthentication | None = None


# ── JSON-RPC 2.0 ─────────────────────────────────────────────────────────────

class JsonRpcErrorObject(BaseModel):
    code: int
    message: str
    data: Any | None = None


class JsonRpcRequest(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int
    method: str
    params: dict[str, Any] | None = None


class JsonRpcResponse(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int
    result: Any | None = None
    error: JsonRpcErrorObject | None = None


# ── Task Send/Get/Cancel Params ──────────────────────────────────────────────

class TaskSendParams(BaseModel):
    id: str
    sessionId: str | None = None
    message: Message
    skill: str | None = None
    metadata: dict[str, Any] | None = None


class TaskGetParams(BaseModel):
    id: str


class TaskCancelParams(BaseModel):
    id: str
