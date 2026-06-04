"""
rag_engine.py — Week 6 Extension
Query engine that supports:
  - Multi-doc filtering (query across all or selected docs)
  - Conversation history (multi-turn context passed to the LLM)
  - Confidence scores (cosine similarity from retrieval step)
  - Source attribution (which doc/page each answer chunk came from)
"""

from dataclasses import dataclass, field
from typing import Optional
from multi_doc_manager import get_vector_store_index, OLLAMA_MODEL, OLLAMA_BASE_URL

from llama_index.core import PromptTemplate
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.llms.ollama import Ollama


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class SourceChunk:
    filename: str
    doc_id: str
    source_type: str       # "pdf" or "url"
    page_label: str        # e.g. "3" for PDFs, "" for URLs
    text_snippet: str      # first ~200 chars of the chunk
    score: float           # cosine similarity (0–1); higher = more relevant


@dataclass
class RAGResponse:
    answer: str
    sources: list[SourceChunk]
    query: str
    top_score: float       # highest source score — proxy for "confidence"
    confidence_label: str  # "High" / "Medium" / "Low"


@dataclass
class ConversationSession:
    """Holds the chat history for one user session."""
    history: list[dict] = field(default_factory=list)
    # Each entry: {"role": "user"|"assistant", "content": str}

    def add_turn(self, user_msg: str, assistant_msg: str):
        self.history.append({"role": "user", "content": user_msg})
        self.history.append({"role": "assistant", "content": assistant_msg})

    def clear(self):
        self.history.clear()

    def format_for_prompt(self, max_turns: int = 6) -> str:
        """Return last N turns as a formatted string for prompt injection."""
        recent = self.history[-(max_turns * 2):]
        lines = []
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content']}")
        return "\n".join(lines)


# ── Confidence scoring ─────────────────────────────────────────────────────────

def _score_to_label(score: float) -> str:
    if score >= 0.75:
        return "High"
    elif score >= 0.50:
        return "Medium"
    else:
        return "Low"


# ── Prompt template with history injection ─────────────────────────────────────

RAG_PROMPT = PromptTemplate(
    """You are a precise, citation-aware research assistant.
Use ONLY the context below to answer the question.
If the context does not contain the answer, say "I could not find this in the provided documents."
Do NOT make up information.

--- CONVERSATION HISTORY ---
{conversation_history}

--- CONTEXT ---
{context_str}

--- QUESTION ---
{query_str}

--- ANSWER ---"""
)


# ── Main query function ────────────────────────────────────────────────────────

def query(
    user_query: str,
    session: ConversationSession,
    doc_ids: Optional[list[str]] = None,
    top_k: int = 5,
) -> RAGResponse:
    """
    Run a RAG query.

    Args:
        user_query:  The user's question.
        session:     ConversationSession object (maintains history across turns).
        doc_ids:     Optional list of doc_ids to restrict retrieval to.
                     None = query all ingested documents.
        top_k:       Number of source chunks to retrieve.

    Returns:
        RAGResponse with answer, sources, and confidence info.
    """
    index = get_vector_store_index()

    # Build retriever
    retriever = index.as_retriever(similarity_top_k=top_k)
    nodes = retriever.retrieve(user_query)

    # Post-filter by doc_ids if requested
    if doc_ids:
        nodes = [n for n in nodes if n.metadata.get("doc_id") in doc_ids]

    if not nodes:
        empty_response = RAGResponse(
            answer="I could not find relevant content in the selected documents.",
            sources=[],
            query=user_query,
            top_score=0.0,
            confidence_label="Low",
        )
        session.add_turn(user_query, empty_response.answer)
        return empty_response

    # Build context string from retrieved chunks
    context_parts = []
    sources = []
    for node in nodes:
        meta = node.metadata
        filename = meta.get("filename", "unknown")
        page = meta.get("page_label", "")
        text = node.get_content()
        score = float(node.score) if node.score is not None else 0.0

        context_parts.append(
            f"[Source: {filename}{', page ' + page if page else ''}]\n{text}"
        )
        sources.append(SourceChunk(
            filename=filename,
            doc_id=meta.get("doc_id", ""),
            source_type=meta.get("source_type", "unknown"),
            page_label=page,
            text_snippet=text[:220].strip(),
            score=round(score, 4),
        ))

    context_str = "\n\n---\n\n".join(context_parts)
    conversation_history = session.format_for_prompt()

    # Build the prompt
    prompt = RAG_PROMPT.format(
        conversation_history=conversation_history if conversation_history else "(none yet)",
        context_str=context_str,
        query_str=user_query,
    )

    # Call LLM
    llm = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, request_timeout=180.0)
    llm_response = llm.complete(prompt)
    answer = llm_response.text.strip()

    # Compute confidence from top source score
    top_score = sources[0].score if sources else 0.0

    # Save turn to history
    session.add_turn(user_query, answer)

    return RAGResponse(
        answer=answer,
        sources=sorted(sources, key=lambda s: s.score, reverse=True),
        query=user_query,
        top_score=top_score,
        confidence_label=_score_to_label(top_score),
    )