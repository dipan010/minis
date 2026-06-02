"""
core/query.py — RAG query engine with citations and confidence scoring.

THIS IS WHERE RETRIEVAL MEETS GENERATION.

When a user asks a question, this module:
1. Embeds the question → 768-dim vector (same space as the stored chunks).
2. Finds the top-k most similar chunks from ChromaDB (cosine similarity).
3. Constructs a prompt: system instructions + retrieved chunks + question.
4. Sends that prompt to llama3.1:8b via Ollama.
5. Returns the answer + source citations + confidence metadata.

DESIGN DECISIONS:

1. response_mode="compact" (not "refine"):
   - "compact" concatenates all retrieved chunks into one prompt and makes
     a SINGLE LLM call. Fast, cheap, predictable.
   - "refine" makes one LLM call per chunk, iteratively refining the answer.
     Better for very long contexts but 5x slower and 5x the token usage.
   - For a local Ollama setup, "compact" is the right default. Switch to
     "refine" only if answers are missing information from later chunks.

2. Custom QA template over LlamaIndex defaults:
   - The default template is generic. Our custom template:
     a) Forces the model to cite which source each claim comes from.
     b) Instructs it to say "I don't have enough information" rather than
        hallucinate when chunks don't contain the answer.
     c) Keeps answers concise — local 8B models ramble without constraints.

3. Confidence scoring via similarity_score:
   - Each retrieved chunk has a cosine similarity score (0-1) to the query.
   - We average the top-k scores to produce a "confidence" metric.
   - This is NOT the model's confidence in its answer (that's unknowable).
     It's "how relevant were the retrieved chunks to the question."
   - Low confidence (<0.3) = the KB probably doesn't contain relevant info.
     High confidence (>0.7) = strong semantic match to stored content.

4. Conversation history via chat_history parameter:
   - We prepend previous Q&A pairs to the prompt so the model can handle
     follow-up questions ("what about the second point?", "explain more").
   - Limited to last 3 turns to stay within context window limits.
   - This is a simple approach. A production system would use a
     ConversationMemory abstraction, but for a portfolio project, explicit
     history passing is clearer and more debuggable.
"""

import logging
from typing import Optional
from dataclasses import dataclass, field

from llama_index.core.prompts import PromptTemplate

from config import settings
from core.ingest import get_or_create_index

logger = logging.getLogger(__name__)

# ── Custom QA Prompt ──────────────────────────────────────────────────────
# This replaces LlamaIndex's default template.
# Key instructions:
# - CITE your sources (tells model to reference chunk metadata).
# - Don't make things up (anti-hallucination guardrail).
# - Be concise (local 8B models love to ramble).
QA_TEMPLATE = PromptTemplate(
    "You are a knowledgeable assistant answering questions using ONLY the "
    "provided context documents. Follow these rules strictly:\n\n"
    "1. Answer based ONLY on the context below. Do NOT use outside knowledge.\n"
    "2. Cite your sources by mentioning the document name and page number "
    "when available (e.g., 'According to manual.pdf, page 5...').\n"
    "3. If the context does not contain enough information to answer, say: "
    "'I don't have enough information in the knowledge base to answer this.'\n"
    "4. Be concise and direct. No filler phrases.\n"
    "5. If multiple sources discuss the topic, synthesize them and cite each.\n\n"
    "---------------------\n"
    "Context from knowledge base:\n"
    "{context_str}\n"
    "---------------------\n\n"
    "Question: {query_str}\n\n"
    "Answer: "
)


@dataclass
class QueryResult:
    """Structured query response with citations and confidence."""
    answer: str
    sources: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    chunks_used: int = 0


def query_knowledge_base(
    question: str,
    chat_history: Optional[list[dict]] = None,
) -> QueryResult:
    """
    Query the knowledge base and return an answer with citations.

    Parameters:
        question: The user's question.
        chat_history: Optional list of {"role": "user"|"assistant", "content": "..."}
                      for follow-up context. Max 3 recent turns used.

    Flow:
    1. Load the VectorStoreIndex (connects to ChromaDB).
    2. Build a query engine with our custom prompt template.
    3. If chat_history exists, prepend it to the question as context.
    4. Execute the query → retrieves chunks + generates answer.
    5. Extract source citations from the retrieved nodes' metadata.
    6. Compute confidence from average similarity scores.
    7. Return structured QueryResult.
    """
    index = get_or_create_index()

    # Build the query engine with our custom prompt and retrieval settings.
    query_engine = index.as_query_engine(
        similarity_top_k=settings.top_k,
        response_mode=settings.response_mode,
        text_qa_template=QA_TEMPLATE,
    )

    # ── Handle conversation history ──────────────────────────────────
    # Prepend the last 3 turns as context so the model can resolve
    # pronouns and references ("what about that?", "explain more").
    augmented_question = question
    if chat_history:
        recent = chat_history[-3:]  # Last 3 turns max
        history_text = "\n".join(
            f"{'User' if turn['role'] == 'user' else 'Assistant'}: {turn['content']}"
            for turn in recent
        )
        augmented_question = (
            f"Previous conversation:\n{history_text}\n\n"
            f"Current question: {question}"
        )

    # ── Execute query ────────────────────────────────────────────────
    response = query_engine.query(augmented_question)

    # ── Extract citations ────────────────────────────────────────────
    # Each source_node is a chunk that was retrieved. We extract its
    # metadata (source file, page number) and a text snippet.
    sources = []
    similarity_scores = []

    for node in response.source_nodes:
        meta = node.node.metadata
        score = node.score if node.score is not None else 0.0
        similarity_scores.append(score)

        # Build a short snippet (first 200 chars of the chunk text).
        # This goes in the "Sources" panel so the user can see WHAT
        # was retrieved, not just WHERE it came from.
        snippet = node.node.text[:200].strip()
        if len(node.node.text) > 200:
            snippet += "..."

        sources.append({
            "source": meta.get("source", "Unknown"),
            "source_type": meta.get("source_type", "unknown"),
            "page": meta.get("page"),
            "score": round(score, 3),
            "snippet": snippet,
        })

    # ── Confidence score ─────────────────────────────────────────────
    # Average similarity across retrieved chunks.
    # This answers: "How well did the KB match this question?"
    # NOT: "How confident is the model in its answer?"
    confidence = (
        sum(similarity_scores) / len(similarity_scores)
        if similarity_scores
        else 0.0
    )

    return QueryResult(
        answer=str(response),
        sources=sources,
        confidence=round(confidence, 3),
        chunks_used=len(sources),
    )