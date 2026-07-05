"""A2A protocol handler for the RAG Knowledge Base App."""

from __future__ import annotations

import base64
import logging
import tempfile
from pathlib import Path

from a2a_core import (
    AgentCard,
    AgentSkill,
    AgentCapabilities,
    Artifact,
    DataPart,
    FilePart,
    Message,
    TaskSendParams,
    TextPart,
    TaskStore,
    create_a2a_router,
)
from a2a_core.router import TaskSendResult

from core.ingest import ingest_pdf, ingest_url, list_sources
from core.query import query_knowledge_base

logger = logging.getLogger(__name__)

# ── Agent Card ────────────────────────────────────────────────────────────────

agent_card = AgentCard(
    name="RAG Knowledge Base",
    description="Ingests PDFs and URLs into a vector knowledge base, then answers questions with cited sources.",
    url="http://localhost:8000",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=False, pushNotifications=False),
    defaultInputModes=["text/plain", "application/pdf"],
    defaultOutputModes=["application/json"],
    skills=[
        AgentSkill(
            id="query-knowledge-base",
            name="Knowledge Base Query",
            description="Answers a question using the ingested knowledge base, returning the answer with source citations, confidence score, and chunk count.",
            tags=["rag", "qa", "knowledge-base", "search"],
            examples=["What does the document say about X?", "Summarize the key points about Y"],
            inputModes=["text/plain"],
            outputModes=["application/json"],
        ),
        AgentSkill(
            id="ingest-pdf",
            name="PDF Ingestion",
            description="Ingests a PDF document into the knowledge base for future querying.",
            tags=["ingest", "pdf", "document"],
            inputModes=["application/pdf"],
            outputModes=["application/json"],
        ),
        AgentSkill(
            id="ingest-url",
            name="URL Ingestion",
            description="Scrapes and ingests a web page into the knowledge base.",
            tags=["ingest", "url", "web"],
            inputModes=["text/plain"],
            outputModes=["application/json"],
        ),
    ],
)

# ── Task Store ────────────────────────────────────────────────────────────────

task_store = TaskStore()


# ── Skill Handlers ────────────────────────────────────────────────────────────

def _handle_query(params: TaskSendParams) -> TaskSendResult:
    """Handle query-knowledge-base skill."""
    text_part = next(
        (p for p in params.message.parts if isinstance(p, TextPart)),
        None,
    )
    if not text_part:
        raise ValueError("No text part found. Send the question as a TextPart.")

    question = text_part.text.strip()
    if not question:
        raise ValueError("Question is empty.")

    result = query_knowledge_base(question=question)

    return TaskSendResult(
        artifacts=[
            Artifact(
                name="query-result",
                description="RAG query result with citations",
                parts=[
                    DataPart(data={
                        "answer": result.answer,
                        "sources": result.sources,
                        "confidence": result.confidence,
                        "chunks_used": result.chunks_used,
                    }),
                ],
            ),
        ],
        agent_message=Message(
            role="agent",
            parts=[TextPart(text=result.answer)],
        ),
    )


def _handle_ingest_pdf(params: TaskSendParams) -> TaskSendResult:
    """Handle ingest-pdf skill via FilePart."""
    file_part = next(
        (p for p in params.message.parts if isinstance(p, FilePart)),
        None,
    )
    if not file_part or not file_part.file.bytes:
        raise ValueError("No FilePart with base64 bytes found. Send the PDF as a FilePart.")

    pdf_bytes = base64.b64decode(file_part.file.bytes)
    filename = file_part.file.name or "uploaded.pdf"

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        result = ingest_pdf(tmp_path, filename=filename)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if result.get("status") == "error":
        raise ValueError(result.get("message", "Ingestion failed"))

    return TaskSendResult(
        artifacts=[
            Artifact(
                name="ingest-result",
                description="PDF ingestion result",
                parts=[DataPart(data=result)],
            ),
        ],
        agent_message=Message(
            role="agent",
            parts=[TextPart(text=f"Ingested {filename}: {result.get('pages_ingested', 0)} pages, {result.get('word_count', 0)} words.")],
        ),
    )


def _handle_ingest_url(params: TaskSendParams) -> TaskSendResult:
    """Handle ingest-url skill via TextPart containing URL."""
    text_part = next(
        (p for p in params.message.parts if isinstance(p, TextPart)),
        None,
    )
    if not text_part:
        raise ValueError("No text part found. Send the URL as a TextPart.")

    url = text_part.text.strip()
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")

    result = ingest_url(url)

    if result.get("status") == "error":
        raise ValueError(result.get("message", "URL ingestion failed"))

    return TaskSendResult(
        artifacts=[
            Artifact(
                name="ingest-result",
                description="URL ingestion result",
                parts=[DataPart(data=result)],
            ),
        ],
        agent_message=Message(
            role="agent",
            parts=[TextPart(text=f"Ingested {url}: {result.get('word_count', 0)} words.")],
        ),
    )


# ── Unified Handler ──────────────────────────────────────────────────────────

SKILL_HANDLERS = {
    "query-knowledge-base": _handle_query,
    "ingest-pdf": _handle_ingest_pdf,
    "ingest-url": _handle_ingest_url,
}


async def handle_task_send(params: TaskSendParams) -> TaskSendResult:
    """Route to the appropriate skill handler."""
    skill = params.skill

    # If no skill specified, try to infer from content
    if not skill:
        has_file = any(isinstance(p, FilePart) for p in params.message.parts)
        if has_file:
            skill = "ingest-pdf"
        else:
            text_part = next(
                (p for p in params.message.parts if isinstance(p, TextPart)),
                None,
            )
            if text_part and text_part.text.strip().startswith(("http://", "https://")):
                skill = "ingest-url"
            else:
                skill = "query-knowledge-base"

    handler = SKILL_HANDLERS.get(skill)
    if not handler:
        raise ValueError(f"Unknown skill: {skill}. Available: {list(SKILL_HANDLERS.keys())}")

    return handler(params)


# ── Create Router ─────────────────────────────────────────────────────────────

a2a_router = create_a2a_router(
    agent_card=agent_card,
    on_task_send=handle_task_send,
    task_store=task_store,
)
