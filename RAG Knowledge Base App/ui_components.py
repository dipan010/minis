"""
ui_components.py — Week 6 Extension
Reusable Streamlit UI components:
  - render_confidence_badge()  — color-coded High/Medium/Low pill
  - render_source_card()       — expandable card showing chunk text + score
  - render_sources_panel()     — full sources section below an answer
  - render_doc_library()       — sidebar component listing ingested docs
  - render_chat_history()      — displays prior turns in the session
"""

import streamlit as st
from rag_engine import RAGResponse, SourceChunk


# ── Confidence badge ───────────────────────────────────────────────────────────

CONFIDENCE_COLORS = {
    "High":   ("#d1fae5", "#065f46"),   # green bg, dark green text
    "Medium": ("#fef3c7", "#92400e"),   # amber bg, dark amber text
    "Low":    ("#fee2e2", "#991b1b"),   # red bg, dark red text
}

def render_confidence_badge(label: str):
    bg, fg = CONFIDENCE_COLORS.get(label, ("#f3f4f6", "#374151"))
    st.markdown(
        f"""<span style="
            background:{bg};
            color:{fg};
            padding:3px 10px;
            border-radius:12px;
            font-size:0.78rem;
            font-weight:600;
            letter-spacing:0.03em;
        ">{label} confidence</span>""",
        unsafe_allow_html=True,
    )


# ── Single source card ─────────────────────────────────────────────────────────

SOURCE_TYPE_ICON = {"pdf": "📄", "url": "🌐"}

def render_source_card(source: SourceChunk, index: int):
    icon = SOURCE_TYPE_ICON.get(source.source_type, "📎")
    short_name = source.filename if len(source.filename) <= 48 else "..." + source.filename[-45:]
    score_pct = int(source.score * 100)

    with st.expander(f"{icon} {short_name}  —  {score_pct}% match", expanded=False):
        col1, col2 = st.columns([3, 1])

        with col1:
            if source.page_label:
                st.caption(f"Page {source.page_label}")
            st.markdown(
                f"""<div style="
                    background:#f8fafc;
                    border-left:3px solid #6366f1;
                    padding:10px 14px;
                    border-radius:4px;
                    font-size:0.85rem;
                    color:#374151;
                    font-family:'Georgia', serif;
                    line-height:1.6;
                ">{source.text_snippet}…</div>""",
                unsafe_allow_html=True,
            )

        with col2:
            # Score gauge visual
            st.markdown(
                f"""<div style="text-align:center; padding-top:8px;">
                    <div style="
                        font-size:1.6rem;
                        font-weight:700;
                        color:{'#059669' if score_pct >= 75 else '#d97706' if score_pct >= 50 else '#dc2626'};
                    ">{score_pct}%</div>
                    <div style="font-size:0.7rem; color:#9ca3af; margin-top:2px;">relevance</div>
                </div>""",
                unsafe_allow_html=True,
            )


# ── Full sources panel ─────────────────────────────────────────────────────────

def render_sources_panel(response: RAGResponse):
    """Render the complete sources section below an answer."""
    if not response.sources:
        st.caption("No sources retrieved.")
        return

    st.markdown("---")
    col1, col2 = st.columns([4, 1])
    with col1:
        st.markdown(f"**Sources** ({len(response.sources)} chunks retrieved)")
    with col2:
        render_confidence_badge(response.confidence_label)

    st.markdown("<div style='height:6px'></div>", unsafe_allow_html=True)

    for i, source in enumerate(response.sources):
        render_source_card(source, i)


# ── Doc library sidebar ────────────────────────────────────────────────────────

def render_doc_library(docs: list[dict], on_delete=None) -> list[str]:
    """
    Render the ingested document list in the sidebar.

    Args:
        docs:      List of dicts from multi_doc_manager.list_ingested_docs()
        on_delete: Optional callback(doc_id) called when user clicks delete.

    Returns:
        List of doc_ids the user has selected to query (empty = query all).
    """
    st.sidebar.markdown("### 📚 Document Library")

    if not docs:
        st.sidebar.caption("No documents ingested yet. Upload a PDF or paste a URL above.")
        return []

    selected = []
    for doc in docs:
        icon = SOURCE_TYPE_ICON.get(doc["source_type"], "📎")
        short = doc["filename"] if len(doc["filename"]) <= 32 else "..." + doc["filename"][-29:]
        ingested = doc["ingested_at"][:10] if doc.get("ingested_at") else ""

        col1, col2 = st.sidebar.columns([5, 1])
        with col1:
            checked = st.checkbox(
                f"{icon} {short}",
                value=True,
                key=f"doc_select_{doc['doc_id']}",
                help=f"{doc['chunk_count']} chunks · ingested {ingested}",
            )
            if checked:
                selected.append(doc["doc_id"])
        with col2:
            if on_delete and st.button("🗑", key=f"del_{doc['doc_id']}", help="Remove this doc"):
                on_delete(doc["doc_id"])
                st.rerun()

    if selected:
        st.sidebar.caption(f"Querying {len(selected)} of {len(docs)} doc(s)")
    else:
        st.sidebar.caption("⚠️ No docs selected — select at least one.")

    return selected


# ── Chat history display ───────────────────────────────────────────────────────

def render_chat_history(history: list[dict]):
    """
    Render conversation history as a chat-style timeline.
    history items: {"role": "user"|"assistant", "content": str}
    """
    for msg in history:
        if msg["role"] == "user":
            with st.chat_message("user"):
                st.markdown(msg["content"])
        else:
            with st.chat_message("assistant"):
                st.markdown(msg["content"])