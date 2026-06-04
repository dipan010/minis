"""
app.py — Week 6 RAG Knowledge Base
Wires together:
  - multi_doc_manager  → PDF + URL ingestion, multi-doc ChromaDB
  - rag_engine         → query with conversation history + confidence scores
  - ui_components      → source attribution UI, doc library sidebar

Run with:
    streamlit run app.py
"""

import streamlit as st
from multi_doc_manager import ingest_pdf, ingest_url, list_ingested_docs, delete_doc
from rag_engine import ConversationSession, query as rag_query
from ui_components import render_sources_panel, render_doc_library, render_chat_history

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="RAG Knowledge Base",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    html, body, [class*="css"] { font-family: 'Sora', sans-serif; }

    .main-title {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0;
    }
    .subtitle {
        color: #6b7280;
        font-size: 0.9rem;
        margin-top: 4px;
        margin-bottom: 24px;
    }
    .ingest-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 20px;
    }
    .answer-box {
        background: linear-gradient(135deg, #fafafa 0%, #f0f4ff 100%);
        border: 1px solid #e0e7ff;
        border-radius: 12px;
        padding: 20px 24px;
        margin: 12px 0;
        font-size: 0.95rem;
        line-height: 1.7;
        color: #1e293b;
    }
    .stChatMessage { border-radius: 12px; }
    .stButton > button {
        border-radius: 8px;
        font-family: 'Sora', sans-serif;
        font-weight: 600;
    }
    code, .stCode { font-family: 'JetBrains Mono', monospace; }
    .sidebar-section { margin-bottom: 24px; }
</style>
""", unsafe_allow_html=True)


# ── Session state init ─────────────────────────────────────────────────────────
if "session" not in st.session_state:
    st.session_state.session = ConversationSession()

if "last_response" not in st.session_state:
    st.session_state.last_response = None


# ── Sidebar: ingestion + doc library ──────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🧠 RAG Knowledge Base")
    st.markdown("---")

    # ── Ingest PDF
    st.markdown("### ➕ Add Documents")
    uploaded_file = st.file_uploader("Upload PDF", type=["pdf"], label_visibility="collapsed")
    if uploaded_file:
        with st.spinner(f"Ingesting {uploaded_file.name}…"):
            result = ingest_pdf(uploaded_file.read(), uploaded_file.name)
        if result["already_existed"]:
            st.info(f"Already ingested: **{result['filename']}** ({result['chunk_count']} chunks)")
        else:
            st.success(f"✅ {result['filename']} — {result['chunk_count']} chunks added")

    # ── Ingest URL
    url_input = st.text_input("Or paste a URL", placeholder="https://example.com/article")
    if st.button("Ingest URL", use_container_width=True):
        if url_input.strip():
            with st.spinner("Fetching and ingesting…"):
                try:
                    result = ingest_url(url_input.strip())
                    if result["already_existed"]:
                        st.info(f"Already ingested: {result['filename']}")
                    else:
                        st.success(f"✅ {result['chunk_count']} chunks ingested from URL")
                except Exception as e:
                    st.error(f"Failed to ingest URL: {e}")
        else:
            st.warning("Paste a URL first.")

    st.markdown("---")

    # ── Doc library with selection + delete
    docs = list_ingested_docs()
    selected_doc_ids = render_doc_library(docs, on_delete=delete_doc)

    st.markdown("---")

    # ── Clear conversation
    if st.button("🗑 Clear conversation", use_container_width=True):
        st.session_state.session.clear()
        st.session_state.last_response = None
        st.rerun()


# ── Main panel ─────────────────────────────────────────────────────────────────
st.markdown('<div class="main-title">RAG Knowledge Base</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">Ask questions across your ingested documents · Week 6 build</div>', unsafe_allow_html=True)

# ── Render conversation history
history = st.session_state.session.history
if history:
    render_chat_history(history)
else:
    if not docs:
        st.info("👈 Start by uploading a PDF or pasting a URL in the sidebar.")
    else:
        st.caption("Documents loaded. Ask a question below.")

# ── Query input
query_text = st.chat_input(
    "Ask a question across your documents…",
    disabled=(not docs or not selected_doc_ids),
)

if query_text:
    if not selected_doc_ids:
        st.warning("Select at least one document in the sidebar before querying.")
    else:
        # Show user message immediately
        with st.chat_message("user"):
            st.markdown(query_text)

        with st.chat_message("assistant"):
            with st.spinner("Thinking…"):
                response = rag_query(
                    user_query=query_text,
                    session=st.session_state.session,
                    doc_ids=selected_doc_ids if len(selected_doc_ids) < len(docs) else None,
                )
            st.session_state.last_response = response

            # Answer
            st.markdown(
                f'<div class="answer-box">{response.answer}</div>',
                unsafe_allow_html=True,
            )

            # Sources panel
            render_sources_panel(response)

# ── Persistent sources panel for last response (on page re-runs)
elif st.session_state.last_response and history:
    with st.expander("📎 Sources from last answer", expanded=False):
        render_sources_panel(st.session_state.last_response)