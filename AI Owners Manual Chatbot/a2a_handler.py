"""A2A protocol handler for the AI Owners Manual Chatbot."""

from __future__ import annotations

import base64
import logging

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

from ingestion import build_index
from skills import run_skill, get_router, SKILLS

logger = logging.getLogger(__name__)

# ── Agent Card ────────────────────────────────────────────────────────────────

_skills = [
    AgentSkill(
        id="maintenance-schedule",
        name="Maintenance Schedule",
        description="Extracts maintenance tasks and intervals from the loaded product manual.",
        tags=["maintenance", "schedule", "service"],
        examples=["When should I change the oil?", "What are the maintenance intervals?"],
        inputModes=["text/plain"],
        outputModes=["application/json"],
    ),
    AgentSkill(
        id="warning-lights",
        name="Warning Lights",
        description="Identifies and explains warning lights and dashboard indicators from the manual.",
        tags=["warning", "dashboard", "indicators"],
        examples=["What does the red warning light mean?", "Why is the dashboard light on?"],
        inputModes=["text/plain"],
        outputModes=["application/json"],
    ),
    AgentSkill(
        id="troubleshoot",
        name="Troubleshooting",
        description="Diagnoses problems and provides step-by-step resolution from the manual.",
        tags=["troubleshoot", "diagnosis", "repair"],
        examples=["My device won't turn on", "There is a strange noise"],
        inputModes=["text/plain"],
        outputModes=["application/json"],
    ),
    AgentSkill(
        id="specs-extractor",
        name="Technical Specifications",
        description="Extracts technical specifications and ratings from the manual.",
        tags=["specs", "technical", "dimensions"],
        examples=["What are the technical specifications?", "What is the engine capacity?"],
        inputModes=["text/plain"],
        outputModes=["application/json"],
    ),
    AgentSkill(
        id="general-qa",
        name="General Q&A",
        description="Answers general questions about the product using the manual.",
        tags=["general", "qa", "features"],
        examples=["How do I set this up?", "What does this button do?"],
        inputModes=["text/plain"],
        outputModes=["application/json"],
    ),
    AgentSkill(
        id="ingest-manual",
        name="Manual Ingestion",
        description="Loads a PDF product manual into the knowledge base for querying.",
        tags=["ingest", "pdf", "manual"],
        inputModes=["application/pdf"],
        outputModes=["application/json"],
    ),
]

agent_card = AgentCard(
    name="AI Owners Manual Chatbot",
    description="Answers questions about product manuals using semantic skill routing (maintenance, warning lights, troubleshooting, specs, general Q&A) with RAG-powered cited answers.",
    url="http://localhost:8000",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=False, pushNotifications=False),
    defaultInputModes=["text/plain", "application/pdf"],
    defaultOutputModes=["application/json"],
    skills=_skills,
)

# ── Task Store ────────────────────────────────────────────────────────────────

task_store = TaskStore()

# ── Module-level state (shared with api_server.py) ────────────────────────────
# In a production system, this would be a proper session store.
_current_index = None
_current_filename: str | None = None

# Map A2A skill IDs → internal skill names
A2A_TO_INTERNAL_SKILL = {
    "maintenance-schedule": "maintenance_schedule",
    "warning-lights": "warning_lights",
    "troubleshoot": "troubleshoot",
    "specs-extractor": "specs_extractor",
    "general-qa": "general_qa",
}


def set_index(index, filename: str) -> None:
    """Called by api_server.py when a manual is ingested via REST."""
    global _current_index, _current_filename
    _current_index = index
    _current_filename = filename


# ── Handler ──────────────────────────────────────────────────────────────────

async def handle_task_send(params: TaskSendParams) -> TaskSendResult:
    """Route to the appropriate skill handler."""
    global _current_index, _current_filename

    skill_id = params.skill

    # Check for ingest-manual skill (FilePart with PDF)
    file_part = next(
        (p for p in params.message.parts if isinstance(p, FilePart)),
        None,
    )
    if skill_id == "ingest-manual" or (file_part and not skill_id):
        if not file_part or not file_part.file.bytes:
            raise ValueError("No FilePart with base64 bytes found. Send the PDF as a FilePart.")

        pdf_bytes = base64.b64decode(file_part.file.bytes)
        filename = file_part.file.name or "uploaded.pdf"

        _current_index = build_index(pdf_bytes, filename)
        _current_filename = filename

        from ingestion import extract_pages
        pages = len(extract_pages(pdf_bytes))

        return TaskSendResult(
            artifacts=[
                Artifact(
                    name="ingest-result",
                    description="Manual ingestion result",
                    parts=[DataPart(data={"status": "success", "filename": filename, "pages": pages})],
                ),
            ],
            agent_message=Message(
                role="agent",
                parts=[TextPart(text=f"Ingested {filename}: {pages} pages.")],
            ),
        )

    # Query skills — require a loaded manual
    if _current_index is None:
        raise ValueError("No manual loaded. Send a PDF first using the 'ingest-manual' skill.")

    text_part = next(
        (p for p in params.message.parts if isinstance(p, TextPart)),
        None,
    )
    if not text_part:
        raise ValueError("No text part found. Send the question as a TextPart.")

    question = text_part.text.strip()
    if not question:
        raise ValueError("Question is empty.")

    # Map A2A skill ID to internal skill name
    force_skill = A2A_TO_INTERNAL_SKILL.get(skill_id) if skill_id else None

    router = get_router()
    result = run_skill(
        index=_current_index,
        question=question,
        router=router,
        force_skill=force_skill,
    )

    return TaskSendResult(
        artifacts=[
            Artifact(
                name="query-result",
                description=f"Answer via {result['skill_label']}",
                parts=[
                    DataPart(data={
                        "answer": result["answer"],
                        "sources": result["sources"],
                        "skill_used": result["skill_used"],
                        "similarity": result["similarity"],
                    }),
                ],
            ),
        ],
        agent_message=Message(
            role="agent",
            parts=[TextPart(text=result["answer"])],
        ),
    )


# ── Create Router ─────────────────────────────────────────────────────────────

a2a_router = create_a2a_router(
    agent_card=agent_card,
    on_task_send=handle_task_send,
    task_store=task_store,
)
