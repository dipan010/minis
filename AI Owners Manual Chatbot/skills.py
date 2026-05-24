"""
skills.py — Semantic skill router + tool calls for the Owners Manual chatbot.

HOW THE SEMANTIC ROUTER WORKS:
  1. At startup, build_router() encodes all skill utterances into vectors
     using the same bge-small model already loaded by LlamaIndex.
  2. When a question arrives, skill_router() encodes it and computes
     cosine similarity against every utterance vector.
  3. The skill whose utterances score highest wins.
  4. That skill's system prompt is injected into the LLM query.

This is Option 4 (DIY cosine) from the alternatives discussion:
  - Zero new dependencies (reuses Settings.embed_model from models.py)
  - No LLM call for routing (~50ms vs 2-5s for LLM-based routing)
  - No internet needed (model already cached locally by LlamaIndex)
  - Falls back to general_qa when similarity is below threshold

The semantic_router library (Option 2) wraps this same pattern.
We implement it directly to avoid torch/fastembed sandbox conflicts,
and because reusing the already-loaded embed model is more efficient.
"""

import numpy as np
from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.prompts import PromptTemplate
from ingestion import make_snippet


# ─────────────────────────────────────────────────────────────────────────────
# SKILL DEFINITIONS
# Each skill has:
#   utterances  — example questions a user might ask (used for semantic matching)
#   prompt      — system instruction injected into the LLM for this skill
#   label       — displayed in the UI as a badge on AI responses
# ─────────────────────────────────────────────────────────────────────────────

SKILLS: dict[str, dict] = {
    "maintenance_schedule": {
        "label": "🔧 Maintenance Schedule",
        "utterances": [
            "What are the maintenance intervals?",
            "When should I change the oil?",
            "How often do I need to replace the filter?",
            "What is the service schedule?",
            "When does the brake fluid need changing?",
            "What are the recommended service intervals in km or miles?",
            "How often should I rotate the tyres?",
            "What needs to be replaced and when?",
            "Tell me all the scheduled maintenance tasks.",
            "What are the periodic maintenance requirements?",
        ],
        "prompt": (
            "You are a maintenance scheduling expert reading an owners manual. "
            "Extract ALL maintenance tasks and their intervals from the context. "
            "Format each item as:\n"
            "• [Task]: [Interval] — [Notes if any]\n\n"
            "Only include tasks explicitly mentioned in the context. "
            "Do not invent or assume any maintenance items."
        ),
    },

    "warning_lights": {
        "label": "⚠️ Warning Lights",
        "utterances": [
            "What does the warning light mean?",
            "Why is the dashboard light on?",
            "What does the red indicator mean?",
            "The amber light is flashing — what do I do?",
            "What are all the warning symbols?",
            "What does the check engine light mean?",
            "There is a yellow icon on my dashboard.",
            "What do the dashboard indicators mean?",
            "The warning light came on — is it serious?",
            "What does the orange symbol mean?",
        ],
        "prompt": (
            "You are a diagnostic expert for owners manuals. "
            "Identify ALL warning lights and indicators mentioned in the context. "
            "For each one:\n"
            "• [Indicator name / colour]: [What it signals] → [Recommended action]\n\n"
            "If no warning indicators are found in the context, say so clearly."
        ),
    },

    "troubleshoot": {
        "label": "🔍 Troubleshoot",
        "utterances": [
            "My device is not working — how do I fix it?",
            "It won't turn on.",
            "There is a strange noise.",
            "The machine keeps stopping.",
            "How do I fix this problem?",
            "It is making a vibrating sound.",
            "Something is leaking.",
            "It is overheating.",
            "The error code appeared — what does it mean?",
            "It stopped working suddenly.",
            "How do I diagnose this fault?",
            "My car won't start.",
            "The device is behaving strangely.",
        ],
        "prompt": (
            "You are a troubleshooting expert for owners manuals. "
            "Based on the symptom described and the manual context:\n"
            "1. Most likely cause\n"
            "2. Step-by-step resolution from the manual\n"
            "3. Whether professional service is required\n\n"
            "Use ONLY information from the provided context. "
            "If the issue is not covered, say so and recommend contacting support."
        ),
    },

    "specs_extractor": {
        "label": "📐 Specifications",
        "utterances": [
            "What are the technical specifications?",
            "What is the engine capacity?",
            "What is the power output?",
            "What is the weight of this product?",
            "What are the dimensions?",
            "What voltage does it run on?",
            "What is the maximum speed?",
            "What is the fuel tank capacity?",
            "What are the torque specs?",
            "Tell me the ratings and technical data.",
            "What is the operating temperature range?",
            "How many watts does it consume?",
        ],
        "prompt": (
            "You are a technical specifications expert. "
            "Extract ALL technical specifications from the context. "
            "Format as:\n"
            "• [Spec name]: [Value] [Unit]\n\n"
            "Group related specs (e.g. Engine, Dimensions, Electrical). "
            "Only include specs explicitly stated in the context."
        ),
    },

    "general_qa": {
        "label": "💬 General Q&A",
        "utterances": [
            "How does this work?",
            "What is this product?",
            "Can you explain this feature?",
            "What does this button do?",
            "How do I use this?",
            "What is included in the box?",
            "How do I set it up?",
            "What are the safety precautions?",
            "How do I reset it to factory defaults?",
            "Where is the power button?",
        ],
        "prompt": (
            "You are a helpful assistant for owners manuals. "
            "Answer the question using ONLY the context provided from the manual. "
            "If the answer is not in the context, say clearly that the manual "
            "does not cover this topic. Be concise and direct."
        ),
    },
}

SKILL_LABELS = {k: v["label"] for k, v in SKILLS.items()}

# Fallback threshold — if best similarity is below this, use general_qa
SIMILARITY_THRESHOLD = 0.35


# ─────────────────────────────────────────────────────────────────────────────
# ROUTER — built once, cached in session state by app.py
# ─────────────────────────────────────────────────────────────────────────────

class SemanticSkillRouter:
    """
    Encodes all skill utterances at startup. On each query, encodes the
    question and finds the skill with the highest cosine similarity.

    Uses Settings.embed_model (bge-small-en-v1.5) — already loaded by
    LlamaIndex, so no additional model download or memory cost.
    """

    def __init__(self):
        self._skill_vectors: dict[str, np.ndarray] = {}
        self._build_index()

    def _embed(self, texts: list[str]) -> np.ndarray:
        """Embed a list of texts using the global LlamaIndex embed model."""
        embed_model = Settings.embed_model
        vecs = embed_model.get_text_embedding_batch(texts)
        arr = np.array(vecs, dtype=np.float32)
        # L2-normalise so dot product == cosine similarity
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        return arr / np.maximum(norms, 1e-9)

    def _build_index(self) -> None:
        """
        Embed all utterances for every skill and store as a matrix.
        Each skill gets one matrix of shape (n_utterances, embedding_dim).
        Called once at startup — takes ~1s total.
        """
        for skill_name, skill in SKILLS.items():
            utterances = skill["utterances"]
            vecs = self._embed(utterances)
            self._skill_vectors[skill_name] = vecs   # shape: (n, dim)

    def route(self, question: str) -> tuple[str, float]:
        """
        Route a question to the best-matching skill.

        Returns (skill_name, similarity_score).
        Falls back to 'general_qa' if no skill exceeds SIMILARITY_THRESHOLD.

        Algorithm:
          1. Embed the question into a vector q
          2. For each skill, compute cosine similarity between q and every
             utterance vector, take the MAX (not mean) — we want the best
             single match, not the average
          3. The skill with the highest max similarity wins
        """
        q_vec = self._embed([question])[0]   # shape: (dim,)

        best_skill = "general_qa"
        best_score = 0.0

        for skill_name, utterance_vecs in self._skill_vectors.items():
            # dot product with each utterance (already L2-normalised = cosine sim)
            sims = utterance_vecs @ q_vec           # shape: (n_utterances,)
            max_sim = float(np.max(sims))

            if max_sim > best_score:
                best_score = max_sim
                best_skill = skill_name

        if best_score < SIMILARITY_THRESHOLD:
            best_skill = "general_qa"

        return best_skill, round(best_score, 3)


# ─────────────────────────────────────────────────────────────────────────────
# SKILL EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

def run_skill(
    index: VectorStoreIndex,
    question: str,
    router: SemanticSkillRouter,
    force_skill: str | None = None,
) -> dict:
    """
    Route the question semantically, then run the matched skill's query.

    Returns:
        answer      — LLM response string
        sources     — list of {page, snippet} citation dicts
        skill_used  — skill name key
        skill_label — display label for the UI badge
        similarity  — cosine similarity score from the router
    """
    if force_skill and force_skill in SKILLS:
        skill_name = force_skill
        similarity  = 1.0
    else:
        skill_name, similarity = router.route(question)

    skill       = SKILLS[skill_name]
    system_prompt = skill["prompt"]

    # Inject the skill's system prompt into the LLM via a custom QA template
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

    sources = []
    for node in response.source_nodes:
        meta = node.node.metadata
        page = meta.get("page_label") or meta.get("page") or "?"
        sources.append({
            "page":    page,
            "snippet": make_snippet(node.node.text),
        })

    return {
        "answer":      str(response),
        "sources":     sources,
        "skill_used":  skill_name,
        "skill_label": skill["label"],
        "similarity":  similarity,
    }