"""
Core contract analysis logic — extracted from app.py for use by both
Streamlit UI and FastAPI/A2A endpoints.
"""

import json
import re

import fitz  # PyMuPDF
import ollama


# ── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a senior contract lawyer specialising in risk analysis.
Your job is to read contracts and return a structured JSON analysis.

Risk categories to identify:
- indemnity: one-sided indemnification or hold-harmless clauses
- liability: exclusions, caps, or expansions of liability
- termination: unfavorable termination rights or notice periods
- ip: IP assignment, ownership, or licensing concerns
- exclusivity: non-compete, exclusivity, or lock-in provisions
- payment: payment terms, late fees, or financial penalties
- governing_law: jurisdiction and dispute resolution issues
- other: any other significant clause

Risk score scale (1–10):
1–3 = Low (standard, balanced, no concern)
4–6 = Medium (unusual but common, worth noting)
7–10 = High (one-sided, aggressive, or potentially harmful)

Return ONLY valid JSON with this exact structure — no markdown, no explanation:
{
  "overall_summary": "2–3 sentence plain-English summary of what the contract is about",
  "overall_risk_score": <integer 1-10>,
  "key_concerns": ["concern 1", "concern 2", ...],
  "clauses": [
    {
      "title": "Clause name",
      "category": "indemnity|liability|termination|ip|exclusivity|payment|governing_law|other",
      "plain_english": "What this clause means in plain language (1–2 sentences)",
      "risk_score": <integer 1-10>,
      "risk_reason": "Why this score was given (1 sentence)",
      "risk_flags": ["specific flag", ...]
    }
  ]
}"""


# ── PDF Extraction ───────────────────────────────────────────────────────────

def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text.strip()


# ── Risk Helpers ─────────────────────────────────────────────────────────────

def risk_class(score: int) -> str:
    if score <= 3:
        return "low"
    elif score <= 6:
        return "medium"
    return "high"


def bar_color(score: int) -> str:
    if score <= 3:
        return "#2D7A2D"
    elif score <= 6:
        return "#C07C00"
    return "#C0392B"


def risk_label_text(score: int) -> str:
    if score <= 3:
        return "LOW RISK"
    elif score <= 6:
        return "MODERATE RISK"
    return "HIGH RISK"


# ── Contract Analysis ────────────────────────────────────────────────────────

def analyze_contract(contract_text: str, model: str = "mistral:7b") -> dict:
    """Send contract to Ollama and return parsed JSON analysis."""
    max_chars = 12000
    if len(contract_text) > max_chars:
        contract_text = contract_text[:max_chars] + "\n\n[... document truncated for analysis ...]"

    user_msg = f"""Analyze this contract and return JSON only:\n\n{contract_text}"""

    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        format="json",
        options={"temperature": 0.1},
    )

    raw = response["message"]["content"]
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()

    return json.loads(raw)
