"""
app.py — Streamlit UI for the RAG Knowledge Base.

THIS IS THE PRESENTATION LAYER.

It does three things:
1. Document ingestion UI (upload PDFs, paste URLs)
2. Chat interface for querying the KB
3. Source panel showing what's in the KB and what was cited

ARCHITECTURE:
This file calls core/ modules DIRECTLY — not through the FastAPI API.
Why? Streamlit runs in the same Python process. Adding an HTTP hop to
localhost adds latency and failure modes for zero benefit.

The FastAPI API (api/server.py) exists for NON-Streamlit clients:
curl, React frontends, Slack bots, etc.

STREAMLIT PATTERNS USED:
- st.session_state for chat history: survives Streamlit's re-run cycle.
  Every widget interaction triggers a full script re-run. Without
  session_state, chat history would reset on every click.
- st.sidebar for ingestion: keeps the main area clean for the chat.
- st.expander for source citations: shown per-answer, collapsed by default
  so the chat flow isn't broken by metadata.
- st.spinner: gives feedback during Ollama inference (which can take
  10-30 seconds on CPU for llama3.1:8b).
- st.cache_resource for the index: the VectorStoreIndex is expensive to
  initialize (connects to ChromaDB, loads embeddings config). Caching it
  means it's created once per Streamlit session, not per re-run.

DESIGN DECISIONS:
- Chat-style UI over form-based: people expect to ask follow-up questions.
  A form that resets after each query feels broken.
- Confidence badge: color-coded (red/yellow/green) based on retrieval
  similarity. Gives the user a quick signal of "should I trust this answer?"
- Source snippets in expanders: the user can verify claims against the
  original text without leaving the app.
- Clear KB button with confirmation: destructive action, needs a guard.
"""

import streamlit as st
import logging
from pathlib import Path

from config import settings
from core.ingest import ingest_pdf, ingest_url, list_sources, clear_collection
from core.query import query_knowledge_base

logging.basicConfig(level=logging.INFO)

# ── Page config ───────────────────────────────────────────────────────────
st.set_page_config(
    page_title="KnowledgeForge — RAG Knowledge Base",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────
# Minimal overrides to make Streamlit look less default.
st.markdown("""
<style>
    /* Tighten the main content area */
    .block-container { max-width: 900px; padding-top: 2rem; }

    /* Chat message styling */
    .stChatMessage { border-radius: 12px; }

    /* Confidence badge */
    .confidence-high { color: #22c55e; font-weight: 600; }
    .confidence-mid  { color: #eab308; font-weight: 600; }
    .confidence-low  { color: #ef4444; font-weight: 600; }

    /* Source card */
    .source-card {
        background: #f8f9fa;
        border-left: 3px solid #6366f1;
        padding: 8px 12px;
        margin: 4px 0;
        border-radius: 4px;
        font-size: 0.85em;
    }
</style>
""", unsafe_allow_html=True)


# ── Session state initialization ──────────────────────────────────────────
# These persist across Streamlit re-runs (which happen on every interaction).
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []  # list of {"role", "content", "sources", "confidence"}
if "ingestion_log" not in st.session_state:
    st.session_state.ingestion_log = []  # list of status messages


# ══════════════════════════════════════════════════════════════════════════
# SIDEBAR — Document Ingestion
# ══════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## 📚 Knowledge Base")
    st.caption("Add documents to your KB, then ask questions in the chat.")

    # ── PDF Upload ────────────────────────────────────────────────────
    st.markdown("### Upload PDF")
    uploaded_files = st.file_uploader(
        "Drop PDF files here",
        type=["pdf"],
        accept_multiple_files=True,
        label_visibility="collapsed",
    )

    if uploaded_files:
        if st.button("📥 Ingest PDFs", use_container_width=True):
            for uploaded_file in uploaded_files:
                with st.spinner(f"Ingesting {uploaded_file.name}..."):
                    # Save to temp location, then ingest.
                    settings.ensure_dirs()
                    save_path = Path(settings.upload_dir) / uploaded_file.name
                    save_path.write_bytes(uploaded_file.getvalue())

                    result = ingest_pdf(str(save_path), filename=uploaded_file.name)
                    save_path.unlink(missing_ok=True)

                    if result["status"] == "success":
                        msg = f"✅ {uploaded_file.name} — {result['pages_ingested']} pages ingested"
                    else:
                        msg = f"❌ {uploaded_file.name} — {result.get('message', 'Failed')}"

                    st.session_state.ingestion_log.append(msg)
                    st.toast(msg)

    # ── URL Ingestion ─────────────────────────────────────────────────
    st.markdown("### Add URL")
    url_input = st.text_input(
        "Paste a URL to ingest",
        placeholder="https://docs.example.com/guide",
        label_visibility="collapsed",
    )

    if st.button("🌐 Ingest URL", use_container_width=True, disabled=not url_input):
        with st.spinner(f"Scraping {url_input}..."):
            result = ingest_url(url_input)

            if result["status"] == "success":
                msg = f"✅ {result['source']} — {result.get('word_count', '?')} words ingested"
            else:
                msg = f"❌ {result.get('message', 'Failed to scrape URL')}"

            st.session_state.ingestion_log.append(msg)
            st.toast(msg)

    # ── Ingestion log ─────────────────────────────────────────────────
    if st.session_state.ingestion_log:
        with st.expander("📋 Ingestion Log", expanded=False):
            for entry in reversed(st.session_state.ingestion_log[-10:]):
                st.markdown(f"<small>{entry}</small>", unsafe_allow_html=True)

    # ── Current sources ───────────────────────────────────────────────
    st.markdown("---")
    st.markdown("### 📂 Current Sources")

    sources = list_sources()
    if sources:
        for src in sources:
            icon = "📄" if src["source_type"] == "pdf" else "🌐"
            st.markdown(
                f"{icon} **{src['source']}** — {src['chunks']} chunks"
            )
    else:
        st.caption("No documents ingested yet.")

    # ── Clear KB ──────────────────────────────────────────────────────
    st.markdown("---")
    if sources:
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🗑️ Clear KB", use_container_width=True):
                st.session_state.confirm_clear = True
        with col2:
            if st.session_state.get("confirm_clear"):
                if st.button("⚠️ Confirm", type="primary", use_container_width=True):
                    clear_collection()
                    st.session_state.chat_history = []
                    st.session_state.ingestion_log = []
                    st.session_state.confirm_clear = False
                    st.rerun()

    # ── Config info ───────────────────────────────────────────────────
    st.markdown("---")
    st.caption(f"LLM: `{settings.llm_model}`")
    st.caption(f"Embeddings: `{settings.embed_model}`")
    st.caption(f"Chunks: {settings.chunk_size} tokens, {settings.chunk_overlap} overlap")


# ══════════════════════════════════════════════════════════════════════════
# MAIN AREA — Chat Interface
# ══════════════════════════════════════════════════════════════════════════

st.markdown("# 🔍 KnowledgeForge")
st.markdown("*Ask anything about your ingested documents.*")

# ── Display chat history ──────────────────────────────────────────────────
for i, msg in enumerate(st.session_state.chat_history):
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

        # Show sources for assistant messages.
        if msg["role"] == "assistant" and msg.get("sources"):
            confidence = msg.get("confidence", 0)

            # Color-code confidence.
            if confidence >= 0.7:
                conf_class = "confidence-high"
                conf_label = "High"
            elif confidence >= 0.4:
                conf_class = "confidence-mid"
                conf_label = "Medium"
            else:
                conf_class = "confidence-low"
                conf_label = "Low"

            st.markdown(
                f"<small>Retrieval confidence: "
                f"<span class='{conf_class}'>{conf_label} ({confidence:.0%})</span> "
                f"· {msg.get('chunks_used', 0)} chunks used</small>",
                unsafe_allow_html=True,
            )

            with st.expander(f"📎 Sources ({len(msg['sources'])})"):
                for src in msg["sources"]:
                    page_info = f", p.{src['page']}" if src.get("page") else ""
                    icon = "📄" if src["source_type"] == "pdf" else "🌐"
                    st.markdown(
                        f"<div class='source-card'>"
                        f"<strong>{icon} {src['source']}{page_info}</strong> "
                        f"<small>(relevance: {src['score']:.0%})</small><br>"
                        f"<em>{src['snippet']}</em>"
                        f"</div>",
                        unsafe_allow_html=True,
                    )


# ── Chat input ────────────────────────────────────────────────────────────
if prompt := st.chat_input("Ask a question about your documents..."):
    # Check if KB has any documents.
    if not list_sources():
        st.warning("⚠️ No documents in the knowledge base yet. Upload a PDF or add a URL in the sidebar first.")
    else:
        # Show user message immediately.
        st.session_state.chat_history.append({
            "role": "user",
            "content": prompt,
        })
        with st.chat_message("user"):
            st.markdown(prompt)

        # Build chat history for context (only content, not metadata).
        history_for_query = [
            {"role": m["role"], "content": m["content"]}
            for m in st.session_state.chat_history[:-1]  # exclude current question
        ]

        # Query the knowledge base.
        with st.chat_message("assistant"):
            with st.spinner("Searching knowledge base..."):
                result = query_knowledge_base(
                    question=prompt,
                    chat_history=history_for_query if history_for_query else None,
                )

            st.markdown(result.answer)

            # Show confidence and sources.
            confidence = result.confidence
            if confidence >= 0.7:
                conf_class = "confidence-high"
                conf_label = "High"
            elif confidence >= 0.4:
                conf_class = "confidence-mid"
                conf_label = "Medium"
            else:
                conf_class = "confidence-low"
                conf_label = "Low"

            st.markdown(
                f"<small>Retrieval confidence: "
                f"<span class='{conf_class}'>{conf_label} ({confidence:.0%})</span> "
                f"· {result.chunks_used} chunks used</small>",
                unsafe_allow_html=True,
            )

            if result.sources:
                with st.expander(f"📎 Sources ({len(result.sources)})"):
                    for src in result.sources:
                        page_info = f", p.{src['page']}" if src.get("page") else ""
                        icon = "📄" if src["source_type"] == "pdf" else "🌐"
                        st.markdown(
                            f"<div class='source-card'>"
                            f"<strong>{icon} {src['source']}{page_info}</strong> "
                            f"<small>(relevance: {src['score']:.0%})</small><br>"
                            f"<em>{src['snippet']}</em>"
                            f"</div>",
                            unsafe_allow_html=True,
                        )

        # Save to chat history.
        st.session_state.chat_history.append({
            "role": "assistant",
            "content": result.answer,
            "sources": result.sources,
            "confidence": result.confidence,
            "chunks_used": result.chunks_used,
        })