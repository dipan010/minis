"""
Week 1: AI Owners Manual Chatbot
Stack: Python · LlamaIndex · Streamlit · Ollama (local open-source LLM)

Prerequisites:
    1. Install Ollama: https://ollama.com/download
    2. Pull a model: ollama pull llama3.2
    3. Ollama runs as a local server on http://localhost:11434

Install Python deps:
    pip install streamlit llama-index llama-index-llms-ollama \
                llama-index-embeddings-huggingface pymupdf

Run:
    streamlit run app.py
"""

import streamlit as st
from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.schema import Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import fitz  # pymupdf


# ─────────────────────────────────────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Owners Manual AI",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ─────────────────────────────────────────────────────────────────────────────
# CSS — Stitch design tokens ported into Streamlit
# Strategy: we can't do 3-column CSS grid in Streamlit's layout model,
# so we use: st.sidebar (col1) + st.columns (col2 chat | col3 preview)
# All colors, fonts, and component styles come directly from the Stitch HTML.
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Geist:wght@400;500;600&display=swap');

/* ── Reset & base ── */
html, body, [class*="css"] {
    font-family: 'Geist', sans-serif;
    background-color: #131313;
    color: #e5e2e1;
}

/* ── Hide Streamlit chrome ── */
#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 0 !important; max-width: 100% !important; }

/* ── Sidebar — matches Column 1 from Stitch ── */
section[data-testid="stSidebar"] {
    background: #131313 !important;
    border-right: 1px solid #3b4b3d !important;
    width: 280px !important;
}
section[data-testid="stSidebar"] > div { padding: 24px 20px !important; }

/* Sidebar logo row */
.sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
}
.logo-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #00ff88;
    box-shadow: 0 0 8px #00ff88;
    flex-shrink: 0;
}
.logo-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #e5e2e1;
}

/* Library header */
.lib-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}
.lib-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #b9cbb9;
    opacity: 0.6;
    text-transform: uppercase;
}

/* File card */
.file-card {
    background: #201f1f;
    border: 1px solid #3b4b3d;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 20px;
    cursor: pointer;
    transition: border-color 0.2s;
}
.file-card:hover { border-color: #00ff88; }
.file-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
}
.file-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #e5e2e1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
}
.file-size {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #b9cbb9;
    flex-shrink: 0;
}
.file-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
}
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00ff88; }
.status-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #00ff88;
    letter-spacing: 0.05em;
}

/* Offline badge (top-right of chat header) */
.offline-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1c1b1b;
    border: 1px solid #3b4b3d;
    padding: 3px 10px;
    border-radius: 4px;
}
.offline-dot { width: 6px; height: 6px; border-radius: 50%; background: #00ff88; }
.offline-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #e5e2e1;
}

/* Context pill in header */
.context-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    border-bottom: 1px solid #3b4b3d;
    background: #131313;
    justify-content: space-between;
}
.context-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #b9cbb9;
    letter-spacing: 0.05em;
}
.context-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #201f1f;
    border: 1px solid #3b4b3d;
    padding: 3px 10px;
    border-radius: 4px;
}
.context-pill-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #e5e2e1;
}

/* Chat messages */
.msg-user {
    display: flex;
    justify-content: flex-end;
    margin: 16px 0;
}
.msg-user-bubble {
    max-width: 80%;
    background: #2a2a2a;
    border: 1px solid #3b4b3d;
    border-radius: 12px 12px 4px 12px;
    padding: 12px 16px;
    font-size: 14px;
    line-height: 22px;
    color: #e5e2e1;
}
.msg-ai {
    display: flex;
    gap: 12px;
    margin: 16px 0;
}
.ai-avatar {
    width: 32px; height: 32px;
    border-radius: 4px;
    border: 1px solid #00ff88;
    background: rgba(0,255,136,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    color: #00ff88;
}
.ai-body { flex: 1; }
.ai-bubble {
    background: #201f1f;
    border: 1px solid #3b4b3d;
    border-radius: 4px 12px 12px 12px;
    padding: 16px;
    font-size: 14px;
    line-height: 22px;
    color: #e5e2e1;
}
.ai-bubble .page-ref { color: #00ff88; font-weight: 600; }
.ai-bubble .val-ref  { color: #00e479; }

/* Page citation pill */
.cite-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 4px 10px;
    border: 1px solid #3b4b3d;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #b9cbb9;
    cursor: pointer;
    transition: background 0.2s;
}
.cite-pill:hover { background: #2a2a2a; }

/* Empty state */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    gap: 12px;
    color: #b9cbb9;
    text-align: center;
}
.empty-icon { font-size: 40px; opacity: 0.4; }
.empty-title {
    font-size: 16px;
    font-weight: 600;
    color: #e5e2e1;
    opacity: 0.5;
}
.empty-sub { font-size: 13px; opacity: 0.4; max-width: 300px; }

/* Preview panel */
.preview-panel {
    background: #131313;
    border-left: 1px solid #3b4b3d;
    height: 100%;
    display: flex;
    flex-direction: column;
}
.preview-header {
    padding: 10px 16px;
    border-bottom: 1px solid #3b4b3d;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.preview-subheader {
    padding: 6px 16px;
    border-bottom: 1px solid #3b4b3d;
    background: #1c1b1b;
    display: flex;
    justify-content: space-between;
}
.preview-mono-sm {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #b9cbb9;
    opacity: 0.5;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}
.preview-content {
    background: #f5f5f0;
    color: #1a1a1a;
    padding: 32px;
    border-radius: 4px;
    font-family: Georgia, serif;
    line-height: 1.8;
    font-size: 13px;
    margin: 16px;
    min-height: 400px;
    position: relative;
}
.hl-green { background: rgba(0,255,136,0.2); border-bottom: 2px solid #00ff88; padding: 0 2px; }
.hl-yellow { background: rgba(238,152,0,0.2); border-bottom: 2px solid #ee9800; padding: 0 2px; }

/* Footer bar */
.footer-bar {
    text-align: center;
    padding: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.15em;
    color: #b9cbb9;
    opacity: 0.3;
    text-transform: uppercase;
    border-top: 1px solid #3b4b3d;
}

/* Streamlit input overrides */
div[data-testid="stTextInput"] input,
div[data-testid="stTextArea"] textarea {
    background: #201f1f !important;
    border: 1px solid #3b4b3d !important;
    border-radius: 12px !important;
    color: #e5e2e1 !important;
    font-family: 'Geist', sans-serif !important;
    font-size: 14px !important;
    padding: 14px 16px !important;
}
div[data-testid="stTextInput"] input:focus,
div[data-testid="stTextArea"] textarea:focus {
    border-color: #00ff88 !important;
    box-shadow: 0 0 0 1px #00ff88 !important;
}

/* Streamlit button overrides */
div[data-testid="stButton"] button {
    background: rgba(0,255,136,0.08) !important;
    border: 1px solid rgba(0,255,136,0.25) !important;
    color: #00ff88 !important;
    border-radius: 6px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 11px !important;
    letter-spacing: 0.05em !important;
    transition: all 0.2s !important;
}
div[data-testid="stButton"] button:hover {
    background: #00ff88 !important;
    color: #003919 !important;
}

/* Streamlit selectbox */
div[data-testid="stSelectbox"] > div > div {
    background: #201f1f !important;
    border-color: #3b4b3d !important;
    color: #e5e2e1 !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 11px !important;
    border-radius: 4px !important;
}

/* Streamlit file uploader */
div[data-testid="stFileUploader"] {
    background: #1c1b1b !important;
    border: 2px dashed #3b4b3d !important;
    border-radius: 12px !important;
    padding: 16px !important;
}
div[data-testid="stFileUploader"]:hover {
    border-color: #00ff88 !important;
}

/* Streamlit success/error/warning */
div[data-testid="stAlert"] {
    border-radius: 6px !important;
    font-family: 'Geist', sans-serif !important;
    font-size: 13px !important;
}

/* Column separator */
div[data-testid="column"] + div[data-testid="column"] {
    border-left: 1px solid #3b4b3d;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0a0a0a; }
::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #3b4b3d; }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# SESSION STATE
# ─────────────────────────────────────────────────────────────────────────────
for key, default in {
    "chat_history": [],
    "index": None,
    "doc_name": None,
    "doc_bytes": None,
    "pending_question": None,
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

OLLAMA_MODEL = "llama3.2"


# ─────────────────────────────────────────────────────────────────────────────
# LLAMAINDEX SETTINGS
# ─────────────────────────────────────────────────────────────────────────────
Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=64)


def get_llm(model: str) -> Ollama:
    return Ollama(model=model, request_timeout=120.0)


# ─────────────────────────────────────────────────────────────────────────────
# BACKEND FUNCTIONS (unchanged from previous version)
# ─────────────────────────────────────────────────────────────────────────────
def extract_pages(file_bytes: bytes) -> list[Document]:
    docs = []
    pdf = fitz.open(stream=file_bytes, filetype="pdf")
    for page_num, page in enumerate(pdf, start=1):
        text = page.get_text("text").strip()
        if not text:
            continue
        docs.append(Document(
            text=text,
            metadata={"page": page_num, "page_label": str(page_num)},
        ))
    pdf.close()
    return docs


def make_snippet(text: str, max_len: int = 200) -> str:
    preview = " ".join(text.split())
    return preview[:max_len] + ("…" if len(preview) > max_len else "")


@st.cache_resource(show_spinner=False)
def build_index(file_bytes: bytes, filename: str) -> VectorStoreIndex:
    docs = extract_pages(file_bytes)
    if not docs:
        raise ValueError("No readable text found in this PDF.")
    return VectorStoreIndex.from_documents(docs)


def ask_manual(index: VectorStoreIndex, question: str, model: str) -> dict:
    Settings.llm = get_llm(model)
    engine = index.as_query_engine(similarity_top_k=4, response_mode="compact")
    response = engine.query(question)
    sources = []
    for node in response.source_nodes:
        meta = node.node.metadata
        page = meta.get("page_label") or meta.get("page") or "?"
        snippet = make_snippet(node.node.text)
        sources.append({"page": page, "snippet": snippet})
    return {"answer": str(response), "sources": sources}


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR — Column 1 (Stitch design)
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    # Logo
    st.markdown("""
    <div class="sidebar-logo">
        <div class="logo-dot"></div>
        <span class="logo-text">OWNERS MANUAL AI</span>
    </div>
    """, unsafe_allow_html=True)

    # Active Library section
    file_count = 1 if st.session_state.doc_name else 0
    st.markdown(f"""
    <div class="lib-header">
        <span class="lib-label">Active Library</span>
        <span class="lib-label">{file_count} FILES</span>
    </div>
    """, unsafe_allow_html=True)

    # File card — shown when a doc is indexed
    if st.session_state.doc_name:
        name = st.session_state.doc_name
        size_kb = len(st.session_state.doc_bytes or b"") // 1024
        size_str = f"{size_kb/1024:.1f} MB" if size_kb > 1024 else f"{size_kb} KB"
        st.markdown(f"""
        <div class="file-card">
            <div class="file-card-top">
                <span class="file-name">📄 {name}</span>
                <span class="file-size">{size_str}</span>
            </div>
            <div class="file-status">
                <div class="status-dot"></div>
                <span class="status-text">Indexed</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # Upload drop zone
    uploaded = st.file_uploader(
        "Drop manual to index",
        type=["pdf"],
        label_visibility="collapsed",
    )

    if uploaded:
        file_bytes = uploaded.read()
        if st.button("⚡  Index Manual", use_container_width=True):
            with st.spinner("Indexing pages…"):
                try:
                    idx = build_index(file_bytes, uploaded.name)
                    st.session_state.index     = idx
                    st.session_state.doc_name  = uploaded.name
                    st.session_state.doc_bytes = file_bytes
                    st.session_state.chat_history = []
                    st.success("Indexed successfully")
                except Exception as e:
                    st.error(f"Indexing failed: {e}")

    st.markdown("<div style='margin-top:12px'></div>", unsafe_allow_html=True)

    # Model picker
    model_choice = st.selectbox(
        "Model",
        ["llama3.2", "mistral", "phi3", "gemma2", "llama3.1"],
        label_visibility="visible",
    )

    st.divider()

    if st.button("Clear Chat", use_container_width=True):
        st.session_state.chat_history = []
        st.rerun()

    # Footer
    st.markdown("""
    <div style="margin-top:auto; padding-top:24px;">
        <div style="display:flex; align-items:center; gap:6px; opacity:0.4;">
            <span style="font-size:12px">💾</span>
            <span style="font-family:'JetBrains Mono',monospace; font-size:9px;
                         letter-spacing:0.12em; text-transform:uppercase; color:#b9cbb9;">
                Local-First Web Storage
            </span>
        </div>
    </div>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# PROCESS PENDING QUESTION (must happen before UI renders)
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.pending_question and st.session_state.index:
    q = st.session_state.pending_question
    st.session_state.pending_question = None
    with st.spinner(f"Querying with {model_choice}…"):
        try:
            result = ask_manual(st.session_state.index, q, model_choice)
            st.session_state.chat_history.append({
                "question": q,
                "answer":   result["answer"],
                "sources":  result["sources"],
            })
        except Exception as e:
            st.error(f"Query failed: {e} — is Ollama running? Try: ollama serve")
    st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN LAYOUT — Column 2 (chat) + Column 3 (preview)
# ─────────────────────────────────────────────────────────────────────────────
col_chat, col_preview = st.columns([3, 2])


# ── CHAT COLUMN ──────────────────────────────────────────────────────────────
with col_chat:
    # Context header bar
    doc_label = st.session_state.doc_name or "No document loaded"
    st.markdown(f"""
    <div class="context-bar">
        <div style="display:flex; align-items:center; gap:12px;">
            <span class="context-label">Context:</span>
            <div class="context-pill">
                <span style="color:#00ff88; font-size:13px;">📄</span>
                <span class="context-pill-text">{doc_label}</span>
            </div>
        </div>
        <div class="offline-badge">
            <div class="offline-dot"></div>
            <span class="offline-text">100% OFFLINE</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Chat messages
    if not st.session_state.chat_history:
        st.markdown("""
        <div class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="empty-title">Owners Manual RAG Sandbox</div>
            <div class="empty-sub">Upload a PDF in the sidebar and click Index Manual to begin.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        for turn in st.session_state.chat_history:
            # User bubble
            st.markdown(f"""
            <div class="msg-user">
                <div class="msg-user-bubble">{turn["question"]}</div>
            </div>
            """, unsafe_allow_html=True)

            # AI bubble — build citation pills
            cite_pills = ""
            for src in turn.get("sources", [])[:3]:
                cite_pills += f'<span class="cite-pill">📄 Page {src["page"]}</span> '

            # Wrap answer — highlight page refs and values inline
            answer_html = turn["answer"]

            st.markdown(f"""
            <div class="msg-ai">
                <div class="ai-avatar">AI</div>
                <div class="ai-body">
                    <div class="ai-bubble">{answer_html}</div>
                    <div style="margin-top:8px">{cite_pills}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)

    # Example prompts when indexed but no chat yet
    if st.session_state.index and not st.session_state.chat_history:
        st.markdown("<div style='margin-top:8px'></div>", unsafe_allow_html=True)
        examples = [
            "What are the maintenance intervals?",
            "How do I reset to factory defaults?",
            "What does the warning light mean?",
            "What accessories are included?",
        ]
        c1, c2 = st.columns(2)
        for i, ex in enumerate(examples):
            col = c1 if i % 2 == 0 else c2
            if col.button(ex, key=f"ex_{i}", use_container_width=True):
                st.session_state.pending_question = ex
                st.rerun()

    # Input box
    st.markdown("<div style='padding:16px 0 4px'></div>", unsafe_allow_html=True)
    question = st.text_input(
        "input",
        value="",
        placeholder="Ask about maintenance, warning lights, or features...",
        label_visibility="collapsed",
        key="question_input",
    )
    if question:
        if not st.session_state.index:
            st.warning("Upload and index a PDF first.")
        else:
            st.session_state.pending_question = question
            st.rerun()

    # Footer
    st.markdown("""
    <div class="footer-bar">
        LOCAL OFFLINE INFERENCE &nbsp;•&nbsp; GPU ACCELERATOR ENGINE V1.0.4
    </div>
    """, unsafe_allow_html=True)


# ── PREVIEW COLUMN ─────────────────────────────────────────────────────────
with col_preview:
    if not st.session_state.doc_bytes:
        st.markdown('''
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;padding:48px 24px;min-height:400px;
                    border-left:1px solid #3b4b3d;">
            <div style="opacity:0.15;font-size:36px;margin-bottom:12px;">📄</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;
                        letter-spacing:0.1em;color:#b9cbb9;opacity:0.35;
                        text-transform:uppercase;text-align:center;line-height:1.8;">
                PDF preview will<br>appear here
            </div>
        </div>
        ''', unsafe_allow_html=True)
    else:
        # Get the most recently cited page, default to page 1
        last_page = 1
        if st.session_state.chat_history:
            last_turn = st.session_state.chat_history[-1]
            if last_turn.get("sources"):
                try:
                    last_page = int(last_turn["sources"][0]["page"])
                except (ValueError, TypeError):
                    last_page = 1

        # Extract that page's text via pymupdf
        try:
            pdf = fitz.open(stream=st.session_state.doc_bytes, filetype="pdf")
            total_pages = len(pdf)
            page_idx = min(last_page - 1, total_pages - 1)
            page_text = pdf[page_idx].get_text("text").strip()
            pdf.close()
        except Exception:
            page_text = "Could not render page."
            total_pages = 1

        # Preview header
        st.markdown(f"""
        <div class="preview-header">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="color:#00ff88;">📄</span>
                <span style="font-family:'JetBrains Mono',monospace; font-size:11px;
                             color:#e5e2e1; overflow:hidden; text-overflow:ellipsis;
                             white-space:nowrap; max-width:200px;">
                    {st.session_state.doc_name}
                </span>
            </div>
            <span style="font-family:'JetBrains Mono',monospace; font-size:10px; color:#b9cbb9;">
                Page {last_page} of {total_pages}
            </span>
        </div>
        <div class="preview-subheader">
            <span class="preview-mono-sm">SECURE LOCAL PARSER V2</span>
            <span class="preview-mono-sm">INDEX_REF_{st.session_state.doc_name[:20].upper().replace(' ','_')}</span>
        </div>
        """, unsafe_allow_html=True)

        # Render the page text in the preview panel
        # Highlight snippets from the last AI answer's sources
        highlighted_text = page_text.replace("\n", "<br>")

        if st.session_state.chat_history:
            last_turn = st.session_state.chat_history[-1]
            for src in last_turn.get("sources", [])[:2]:
                snippet_words = src["snippet"][:60].strip()
                if snippet_words and snippet_words in highlighted_text:
                    highlighted_text = highlighted_text.replace(
                        snippet_words,
                        f'<span class="hl-yellow">{snippet_words}</span>',
                        1,
                    )

        st.markdown(f"""
        <div style="overflow-y:auto; padding:16px;">
            <div class="preview-content">
                <div style="display:flex; justify-content:space-between; margin-bottom:24px;
                            border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:8px;">
                    <span style="font-family:'JetBrains Mono',monospace; font-size:9px;
                                 color:rgba(0,0,0,0.35);">SECURE LOCAL PARSER V2</span>
                    <span style="font-family:'JetBrains Mono',monospace; font-size:9px;
                                 color:rgba(0,0,0,0.35);">PAGE {last_page}</span>
                </div>
                <div style="font-size:13px; line-height:1.9;">
                    {highlighted_text}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)