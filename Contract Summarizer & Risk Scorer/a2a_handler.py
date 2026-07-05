"""A2A protocol handler for the Contract Summarizer & Risk Scorer."""

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

from lib.analyzer import extract_pdf_text, analyze_contract, risk_label_text

logger = logging.getLogger(__name__)

# ── Agent Card ────────────────────────────────────────────────────────────────

agent_card = AgentCard(
    name="ContractIQ",
    description="Analyzes contracts for risk, summarizes clauses in plain English, and scores risk on a 1-10 scale per clause and overall.",
    url="http://localhost:8000",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=False, pushNotifications=False),
    defaultInputModes=["text/plain", "application/pdf"],
    defaultOutputModes=["application/json"],
    skills=[
        AgentSkill(
            id="analyze-contract",
            name="Contract Risk Analysis",
            description="Reads a contract, identifies risky clauses (indemnity, liability, termination, IP, exclusivity, payment, governing law), explains each in plain English, and scores risk 1-10.",
            tags=["contract", "risk", "legal", "analysis"],
            examples=["Analyze this NDA for risk", "Score the risk in this freelance agreement"],
            inputModes=["text/plain", "application/pdf"],
            outputModes=["application/json"],
        ),
    ],
)

# ── Task Store ────────────────────────────────────────────────────────────────

task_store = TaskStore()


# ── Handler ──────────────────────────────────────────────────────────────────

async def handle_task_send(params: TaskSendParams) -> TaskSendResult:
    """Analyze a contract sent as TextPart or FilePart."""
    contract_text: str | None = None

    # Check for FilePart (PDF)
    file_part = next(
        (p for p in params.message.parts if isinstance(p, FilePart)),
        None,
    )
    if file_part and file_part.file.bytes:
        pdf_bytes = base64.b64decode(file_part.file.bytes)
        contract_text = extract_pdf_text(pdf_bytes)
        if not contract_text.strip():
            raise ValueError("No readable text found in PDF.")

    # Check for TextPart (plain text contract)
    if not contract_text:
        text_part = next(
            (p for p in params.message.parts if isinstance(p, TextPart)),
            None,
        )
        if text_part:
            contract_text = text_part.text

    if not contract_text or not contract_text.strip():
        raise ValueError("No contract text found. Send as TextPart or FilePart (PDF).")

    # Extract model preference from DataPart if present
    data_part = next(
        (p for p in params.message.parts if isinstance(p, DataPart)),
        None,
    )
    model = (data_part.data.get("model") if data_part else None) or "mistral:7b"

    # Run analysis
    result = analyze_contract(contract_text, model)

    overall_risk = result.get("overall_risk_score", 0)
    risk_label = risk_label_text(overall_risk)

    return TaskSendResult(
        artifacts=[
            Artifact(
                name="contract-analysis",
                description="Contract risk analysis result",
                parts=[DataPart(data=result)],
            ),
        ],
        agent_message=Message(
            role="agent",
            parts=[TextPart(
                text=f"Risk Score: {overall_risk}/10 ({risk_label}). {result.get('overall_summary', '')}"
            )],
        ),
    )


# ── Create Router ─────────────────────────────────────────────────────────────

a2a_router = create_a2a_router(
    agent_card=agent_card,
    on_task_send=handle_task_send,
    task_store=task_store,
)
