"""
Week 1: AI Owners Manual Chatbot
Stack: Python · LlamaIndex · Streamlit · Ollama (local open-source LLM)

Prerequisites:
    1. Install Ollama: https://ollama.com/download
    2. Pull a model: ollama pull llama3.2
    3. Ollama runs as a local server on http://localhost:11434

Install Python deps:
    pip install streamlit llama-index llama-index-llms-ollama \
                llama-index-embeddings-huggingface pypdf pymupdf

Run:
    streamlit run app.py
"""

import streamlit as st

from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.schema import Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# pymupdf gives us clean, structured text extraction — much better than
# SimpleDirectoryReader's default pypdf parser for complex/tagged PDFs
import fitz  # pip install pymupdf


# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Owners Manual AI",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; }

.hero {
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
    border-radius: 16px; padding: 2.5rem 2rem; margin-bottom: 1.5rem;
    border: 1px solid #2a2a4a; position: relative; overflow: hidden;
}
.hero::before {
    content:''; position:absolute; top:-50%; right:-20%;
    width:400px; height:400px;
    background:radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%);
    pointer-events:none;
}
.hero h1 { font-family:'DM Serif Display',serif; font-size:2.2rem; color:#f0f0f0; margin:0 0 .4rem; line-height:1.2; }
.hero p  { color:#9ca3af; font-size:1rem; margin:0; }

.msg-user {
    background:#1e3a5f; border:1px solid #2563eb44;
    border-radius:12px 12px 4px 12px;
    padding:.9rem 1.1rem; margin:.6rem 0;
    max-width:85%; margin-left:auto; color:#e0eaff; font-size:.95rem;
}
.msg-ai {
    background:#111827; border:1px solid #374151;
    border-radius:12px 12px 12px 4px;
    padding:.9rem 1.1rem; margin:.6rem 0;
    max-width:90%; color:#d1d5db; font-size:.95rem; line-height:1.65;
}
.msg-ai strong { color:#818cf8; }

.citation-box {
    background:#0f172a; border:1px solid #1e3a5f;
    border-left:3px solid #6366f1; border-radius:0 8px 8px 0;
    padding:.6rem .9rem; margin-top:.4rem;
    font-size:.82rem; color:#64748b;
}
.citation-box .cite-page { color:#818cf8; font-weight:600; }
.citation-box .cite-snippet { color:#94a3b8; font-style:italic; }

.upload-hint { text-align:center; color:#6b7280; font-size:.88rem; padding:.5rem; }

.status-pill {
    display:inline-block; background:#064e3b; color:#6ee7b7;
    font-size:.78rem; font-weight:600; padding:3px 10px;
    border-radius:999px; letter-spacing:.05em;
}
.status-pill-warn { background:#78350f; color:#fcd34d; }

div[data-testid="stTextInput"] input {
    background:#111827 !important; border:1px solid #374151 !important;
    border-radius:8px !important; color:#f9fafb !important;
    font-family:'DM Sans',sans-serif !important;
}
section[data-testid="stSidebar"] { background:#0d0d0d; }
</style>
""", unsafe_allow_html=True)


# ── Session state ─────────────────────────────────────────────────────────────
for key, default in {
    "chat_history": [],
    "index": None,
    "doc_name": None,
    "pending_question": None,   # FIX 1: stage question here, clear input first
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

OLLAMA_MODEL = "llama3.2"


# ── LlamaIndex settings ───────────────────────────────────────────────────────
Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
Settings.node_parser  = SentenceSplitter(chunk_size=512, chunk_overlap=64)


def get_llm(model: str) -> Ollama:
    return Ollama(model=model, request_timeout=120.0)


# ── PDF extraction via pymupdf ────────────────────────────────────────────────
def extract_pages(file_bytes: bytes) -> list[Document]:
    """
    Use pymupdf (fitz) to extract clean plain text, one Document per page.

    Why pymupdf instead of SimpleDirectoryReader?
    - SimpleDirectoryReader uses pypdf under the hood, which for complex/tagged
      PDFs (like a CV with tables and columns) often pulls in PDF structural
      metadata: /StructElem, /Figure, object references, binary font streams.
    - pymupdf's get_text("text") renders the page as a reading-order text flow,
      stripping all internal PDF structure. The result is clean prose.
    """
    docs = []
    pdf  = fitz.open(stream=file_bytes, filetype="pdf")
    for page_num, page in enumerate(pdf, start=1):
        text = page.get_text("text").strip()
        if not text:          # skip blank / image-only pages
            continue
        docs.append(Document(
            text=text,
            metadata={"page": page_num, "page_label": str(page_num)},
        ))
    pdf.close()
    return docs


def make_snippet(text: str, max_len: int = 200) -> str:
    """Return a short, single-line preview of a chunk — no cleaning needed
    because pymupdf already gives us clean text."""
    preview = " ".join(text.split())   # collapse whitespace / newlines
    return preview[:max_len] + ("…" if len(preview) > max_len else "")


# ── Indexing ──────────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def build_index(file_bytes: bytes, filename: str) -> VectorStoreIndex:
    docs = extract_pages(file_bytes)
    if not docs:
        raise ValueError("No readable text found in this PDF.")
    return VectorStoreIndex.from_documents(docs)


# ── RAG query ─────────────────────────────────────────────────────────────────
def ask_manual(index: VectorStoreIndex, question: str, model: str) -> dict:
    Settings.llm = get_llm(model)
    engine   = index.as_query_engine(similarity_top_k=4, response_mode="compact")
    response = engine.query(question)

    sources = []
    for node in response.source_nodes:
        meta    = node.node.metadata
        page    = meta.get("page_label") or meta.get("page") or "?"
        snippet = make_snippet(node.node.text)
        # Score intentionally excluded — it's an internal embedding metric,
        # not meaningful to end users.
        sources.append({"page": page, "snippet": snippet})

    return {"answer": str(response), "sources": sources}


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚙️ Configuration")
    model_choice = st.selectbox(
        "Ollama model",
        ["llama3.2", "mistral", "phi3", "gemma2", "llama3.1"],
        help="Run `ollama pull <model>` first.",
    )

    st.divider()
    st.markdown("### 📎 Upload Manual")
    uploaded = st.file_uploader("Drop a PDF owners manual", type=["pdf"])

    if uploaded:
        if st.button("⚡ Index this manual", use_container_width=True):
            with st.spinner("Chunking & embedding pages…"):
                try:
                    idx = build_index(uploaded.read(), uploaded.name)
                    st.session_state.index    = idx
                    st.session_state.doc_name = uploaded.name
                    st.session_state.chat_history = []
                    st.success(f"✅ Indexed: **{uploaded.name}**")
                except Exception as e:
                    st.error(f"Indexing failed: {e}")

    st.divider()
    if st.session_state.doc_name:
        st.markdown(
            f'<span class="status-pill">📗 {st.session_state.doc_name}</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown('<span class="status-pill-warn">⚠ No manual loaded</span>',
                    unsafe_allow_html=True)

    st.divider()
    if st.button("🗑 Clear chat", use_container_width=True):
        st.session_state.chat_history = []
        st.rerun()

    st.markdown("""
    <div class="upload-hint">
    Week 1 · AI Portfolio Project<br>
    Stack: Python · LlamaIndex · Streamlit · Ollama
    </div>""", unsafe_allow_html=True)


# ── Main area ─────────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
  <h1>📖 Owners Manual AI</h1>
  <p>Upload any PDF manual → ask questions in plain English → get cited answers. Runs 100% locally via Ollama.</p>
</div>
""", unsafe_allow_html=True)

# ── FIX 1: Process pending question BEFORE rendering the input box ─────────────
# This is the key fix for the duplicate question bug.
# Flow:
#   1. User types → we store question in session_state.pending_question → rerun
#   2. On rerun, we check pending_question here (input box not yet rendered)
#   3. We run RAG, append to history, clear pending_question → rerun
#   4. Final rerun: pending_question is None, input box is empty, history shown
if st.session_state.pending_question and st.session_state.index:
    q = st.session_state.pending_question
    st.session_state.pending_question = None   # clear immediately so no repeat

    with st.spinner(f"Searching manual with {model_choice}…"):
        try:
            result = ask_manual(st.session_state.index, q, model_choice)
            st.session_state.chat_history.append({
                "question": q,
                "answer":   result["answer"],
                "sources":  result["sources"],
            })
        except Exception as e:
            st.error(f"Query failed: {e}\n\nMake sure Ollama is running: `ollama serve`")
    st.rerun()

# ── Render chat history ───────────────────────────────────────────────────────
for turn in st.session_state.chat_history:
    st.markdown(f'<div class="msg-user">🧑 {turn["question"]}</div>',
                unsafe_allow_html=True)
    st.markdown(f'<div class="msg-ai">🤖 {turn["answer"]}</div>',
                unsafe_allow_html=True)

    readable_sources = [s for s in turn.get("sources", []) if s["snippet"]]
    if readable_sources:
        for src in readable_sources[:3]:
            st.markdown(
                f'<div class="citation-box">'
                f'<span class="cite-page">📄 Page {src["page"]}</span><br>'
                f'<span class="cite-snippet">{src["snippet"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

# ── Example questions (shown only before first message) ───────────────────────
if not st.session_state.chat_history and st.session_state.index:
    st.markdown("**💡 Try asking:**")
    examples = [
        "What are the maintenance intervals for this product?",
        "How do I reset it to factory defaults?",
        "What does the warning light mean?",
        "What's in the box / what accessories are included?",
    ]
    cols = st.columns(2)
    for i, ex in enumerate(examples):
        if cols[i % 2].button(ex, key=f"ex_{i}", use_container_width=True):
            st.session_state.pending_question = ex
            st.rerun()

# ── Input box ─────────────────────────────────────────────────────────────────
question = st.text_input(
    "Ask anything about your manual…",
    value="",                              # always empty — no prefill that lingers
    placeholder="e.g. How often should I change the filter?",
    label_visibility="collapsed",
    key="question_input",
)

if question:
    if not st.session_state.index:
        st.warning("⚠ Please upload and index a PDF manual first.")
    else:
        # Stage the question, don't run RAG here — let the top-of-script
        # handler (FIX 1) do it on the next rerun so the input clears cleanly.
        st.session_state.pending_question = question
        st.rerun()