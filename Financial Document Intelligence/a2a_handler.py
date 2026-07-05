"""A2A protocol handler for Financial Document Intelligence (FinLens)."""

from __future__ import annotations

import base64
import io
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

from lib.pipeline import run_full_analysis

logger = logging.getLogger(__name__)

# ── Agent Card ────────────────────────────────────────────────────────────────

agent_card = AgentCard(
    name="FinLens",
    description="AI-powered bank statement analysis: parses CSV statements, categorizes transactions via LLM, detects anomalies, and generates spending insights.",
    url="http://localhost:8000",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=False, pushNotifications=False),
    defaultInputModes=["text/csv"],
    defaultOutputModes=["application/json"],
    skills=[
        AgentSkill(
            id="analyze-statement",
            name="Full Statement Analysis",
            description="Parses a bank statement CSV, categorizes transactions via LLM, computes aggregations, detects anomalies, and generates a natural-language spending summary.",
            tags=["finance", "banking", "analysis", "anomaly-detection"],
            examples=["Analyze my bank statement", "Categorize my transactions and find anomalies"],
            inputModes=["text/csv"],
            outputModes=["application/json"],
        ),
        AgentSkill(
            id="detect-anomalies",
            name="Anomaly Detection",
            description="Detects unusual spending patterns and transaction outliers using z-score analysis on a bank statement.",
            tags=["anomaly", "outlier", "finance"],
            examples=["Find unusual spending patterns", "Detect transaction outliers"],
            inputModes=["text/csv"],
            outputModes=["application/json"],
        ),
    ],
)

# ── Task Store ────────────────────────────────────────────────────────────────

task_store = TaskStore()


# ── Handler ──────────────────────────────────────────────────────────────────

async def handle_task_send(params: TaskSendParams) -> TaskSendResult:
    """Handle A2A tasks — runs the full analysis pipeline or anomaly detection."""
    # Extract CSV from FilePart
    file_part = next(
        (p for p in params.message.parts if isinstance(p, FilePart)),
        None,
    )
    if not file_part or not file_part.file.bytes:
        raise ValueError("No FilePart with base64 bytes found. Send the CSV as a FilePart with mimeType 'text/csv'.")

    csv_bytes = base64.b64decode(file_part.file.bytes)
    csv_source = io.BytesIO(csv_bytes)

    # Extract model config from DataPart if present
    data_part = next(
        (p for p in params.message.parts if isinstance(p, DataPart)),
        None,
    )
    model = (data_part.data.get("model") if data_part else None) or "llama3.1:8b"
    ollama_url = (data_part.data.get("ollama_url") if data_part else None) or "http://localhost:11434"

    # Run full pipeline (covers both skills — analyze-statement includes anomalies)
    result = run_full_analysis(csv_source, ollama_model=model, ollama_url=ollama_url)

    # For detect-anomalies skill, return only the anomaly-related data
    skill = params.skill
    if skill == "detect-anomalies":
        anomaly_result = {
            "anomalies": result["anomalies"],
            "transaction_outliers": result["transaction_outliers"],
            "stats": result["stats"],
        }
        return TaskSendResult(
            artifacts=[
                Artifact(
                    name="anomaly-report",
                    description="Anomaly detection results",
                    parts=[DataPart(data=anomaly_result)],
                ),
            ],
            agent_message=Message(
                role="agent",
                parts=[TextPart(text=f"Found {len(result['anomalies'])} monthly anomalies and {len(result['transaction_outliers'])} transaction outliers.")],
            ),
        )

    # Default: full analysis
    return TaskSendResult(
        artifacts=[
            Artifact(
                name="financial-analysis",
                description="Complete financial statement analysis",
                parts=[DataPart(data=result)],
            ),
        ],
        agent_message=Message(
            role="agent",
            parts=[TextPart(text=result.get("spending_summary_text", "Analysis complete."))],
        ),
    )


# ── Create Router ─────────────────────────────────────────────────────────────

a2a_router = create_a2a_router(
    agent_card=agent_card,
    on_task_send=handle_task_send,
    task_store=task_store,
)
