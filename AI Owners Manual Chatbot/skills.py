"""
skills.py — Tool calls / skills for the Owners Manual chatbot.

Each skill is a specialized query function that handles a specific intent.
The skill_router() detects intent from the user's question and dispatches
to the right skill automatically — no user configuration needed.

Skills:
  1. general_qa           — default RAG, answers any question from the manual
  2. maintenance_schedule — extracts service intervals as a structured list
  3. warning_lights       — identifies all warning indicators and their meaning
  4. troubleshoot         — symptom → probable cause → fix
  5. specs_extractor      — pulls technical specifications as structured data
"""

import re
from llama_index.core import VectorStoreIndex
from ingestion import make_snippet


# ── Intent keyword maps ───────────────────────────────────────────────────────
# Each skill has trigger keywords. The router scores the question against these
# and picks the highest-scoring skill. Falls back to general_qa if no match.

_SKILL_KEYWORDS: dict[str, list[str]] = {
    "maintenance_schedule": [
        "maintenance", "service", "interval", "schedule", "replace", "change",
        "oil", "filter", "tyre", "tire", "fluid", "coolant", "brake", "when",
        "how often", "every", "km", "miles", "months", "years",
    ],
    "warning_lights": [
        "warning", "light", "indicator", "dashboard", "alert", "signal",
        "red", "amber", "yellow", "orange", "icon", "symbol", "blink",
        "flashing", "illuminate", "lamp", "check engine",
    ],
    "troubleshoot": [
        "not working", "broken", "issue", "problem", "fault", "error",
        "won't", "wont", "doesn't", "doesnt", "failed", "fix", "repair",
        "diagnose", "symptom", "strange", "noise", "vibrat", "leak",
        "overheat", "dead", "won't start",
    ],
    "specs_extractor": [
        "spec", "specification", "dimension", "weight", "capacity", "power",
        "torque", "engine", "horsepower", "hp", "kw", "voltage", "ampere",
        "watt", "rpm", "speed", "pressure", "temperature", "size", "rating",
    ],
}


# ── System prompts — each skill has a tailored prompt ────────────────────────

_PROMPTS = {
    "general_qa": (
        "You are a helpful assistant for owners manuals. "
        "Answer the user's question using ONLY the context provided from the manual. "
        "If the answer is not in the context, say so clearly. "
        "Be concise and direct."
    ),

    "maintenance_schedule": (
        "You are a maintenance scheduling expert. "
        "From the provided manual context, extract ALL maintenance tasks and their intervals. "
        "Format your response as a clean list where each item follows this pattern:\n"
        "• [Task name]: every [interval] (e.g. every 5,000 km or 6 months)\n"
        "Include ONLY tasks mentioned in the context. Do not invent tasks."
    ),

    "warning_lights": (
        "You are a vehicle/appliance diagnostic expert. "
        "From the provided manual context, identify ALL warning lights or indicators mentioned. "
        "For each one, provide:\n"
        "• [Indicator name / color]: [What it means] → [Recommended action]\n"
        "If no warning indicators are mentioned in the context, say so."
    ),

    "troubleshoot": (
        "You are a troubleshooting expert for owners manuals. "
        "Based on the symptom described and the manual context provided:\n"
        "1. Identify the most likely cause\n"
        "2. Provide step-by-step resolution from the manual\n"
        "3. Note if professional service is required\n"
        "Use ONLY information from the provided context."
    ),

    "specs_extractor": (
        "You are a technical specifications expert. "
        "From the provided manual context, extract ALL technical specifications mentioned. "
        "Format as a clean list:\n"
        "• [Spec name]: [Value] [Unit]\n"
        "Group related specs together. Only include specs explicitly stated in the context."
    ),
}

# ── Skill labels shown in the UI ──────────────────────────────────────────────
SKILL_LABELS = {
    "general_qa":           "💬 General Q&A",
    "maintenance_schedule": "🔧 Maintenance Schedule",
    "warning_lights":       "⚠️ Warning Lights",
    "troubleshoot":         "🔍 Troubleshoot",
    "specs_extractor":      "📐 Specs",
}


def skill_router(question: str) -> str:
    """
    Score the question against each skill's keyword list.
    Returns the skill name with the highest match score.
    Falls back to 'general_qa' if nothing scores above 0.

    Scoring: each keyword found in the (lowercased) question adds 1 point.
    Multi-word keywords (e.g. "how often") count as 2 points.
    """
    q = question.lower()
    scores: dict[str, int] = {skill: 0 for skill in _SKILL_KEYWORDS}

    for skill, keywords in _SKILL_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                scores[skill] += len(kw.split())   # multi-word = higher weight

    best_skill = max(scores, key=lambda s: scores[s])
    return best_skill if scores[best_skill] > 0 else "general_qa"


def run_skill(
    index: VectorStoreIndex,
    question: str,
    skill_name: str | None = None,
) -> dict:
    """
    Run a skill against the index and return {answer, sources, skill_used}.

    If skill_name is None, the router auto-detects it.
    Each skill injects its system prompt into the LLM call via a custom
    text_qa_template so the model knows how to format its answer.
    """
    from llama_index.core.prompts import PromptTemplate

    # Auto-detect if not forced
    if skill_name is None:
        skill_name = skill_router(question)

    system_prompt = _PROMPTS.get(skill_name, _PROMPTS["general_qa"])

    # Build a prompt template that prepends the skill's system instruction
    qa_template = PromptTemplate(
        "System: " + system_prompt + "\n\n"
        "Context from manual:\n"
        "---------------------\n"
        "{context_str}\n"
        "---------------------\n"
        "Question: {query_str}\n"
        "Answer:"
    )

    engine = index.as_query_engine(
        similarity_top_k=5,
        response_mode="compact",
        text_qa_template=qa_template,
    )

    response = engine.query(question)

    # Build source citations
    sources = []
    for node in response.source_nodes:
        meta = node.node.metadata
        page = meta.get("page_label") or meta.get("page") or "?"
        sources.append({
            "page":    page,
            "snippet": make_snippet(node.node.text),
        })

    return {
        "answer":     str(response),
        "sources":    sources,
        "skill_used": skill_name,
        "skill_label": SKILL_LABELS.get(skill_name, skill_name),
    }