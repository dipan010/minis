"""
Week 1: AI Owners Manual Chatbot
Stack: Python · LlamaIndex · Streamlit · Ollama (local open-source LLM)

Prerequisites:
    1. Install Ollama: https://ollama.com/downloadh
    2. Pull a model: ollama pull llama3.2   (or mistral, phi3, gemma2, etc.)
    3. Ollama runs automatically as a local server on http://localhost:11434

Install Python deps:
    pip install streamlit llama-index llama-index-llms-ollama \
                llama-index-embeddings-huggingface pypdf

Run:
    streamlit run app.py
"""

import tempfile
import streamlit as st
from pathlib import Path

# ── LlamaIndex core ──────────────────────────────────────────────────────────
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.node_parser import SentenceSplitter

# ── Ollama LLM (local, free, no API key needed) ──────────────────────────────
from llama_index.llms.ollama import Ollama

# ── Local embeddings (also free, runs on your CPU) ───────────────────────────
from llama_index.embeddings.huggingface import HuggingFaceEmbedding


# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Owners Manual AI",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');

html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; }

.hero {
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    margin-bottom: 1.5rem;
    border: 1px solid #2a2a4a;
    position: relative;
    overflow: hidden;
}
.hero::before {
    content: '';
    position: absolute;
    top: -50%; right: -20%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
    pointer-events: none;
}
.hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 2.2rem;
    color: #f0f0f0;
    margin: 0 0 0.4rem 0;
    line-height: 1.2;
}
.hero p { color: #9ca3af; font-size: 1rem; margin: 0; }

.msg-user {
    background: #1e3a5f;
    border: 1px solid #2563eb44;
    border-radius: 12px 12px 4px 12px;
    padding: 0.9rem 1.1rem;
    margin: 0.6rem 0;
    max-width: 85%;
    margin-left: auto;
    color: #e0eaff;
    font-size: 0.95rem;
}
.msg-ai {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 12px 12px 12px 4px;
    padding: 0.9rem 1.1rem;
    margin: 0.6rem 0;
    max-width: 90%;
    color: #d1d5db;
    font-size: 0.95rem;
    line-height: 1.65;
}
.msg-ai strong { color: #818cf8; }

.citation-box {
    background: #0f172a;
    border: 1px solid #1e3a5f;
    border-left: 3px solid #6366f1;
    border-radius: 0 8px 8px 0;
    padding: 0.6rem 0.9rem;
    margin-top: 0.5rem;
    font-size: 0.82rem;
    color: #64748b;
}
.citation-box span { color: #818cf8; font-weight: 600; }

.upload-hint { text-align: center; color: #6b7280; font-size: 0.88rem; padding: 0.5rem; }

.status-pill {
    display: inline-block;
    background: #064e3b;
    color: #6ee7b7;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 999px;
    letter-spacing: 0.05em;
}
.status-pill-warn { background: #78350f; color: #fcd34d; }

div[data-testid="stTextInput"] input {
    background: #111827 !important;
    border: 1px solid #374151 !important;
    border-radius: 8px !important;
    color: #f9fafb !important;
    font-family: 'DM Sans', sans-serif !important;
}

section[data-testid="stSidebar"] { background: #0d0d0d; }
</style>
""", unsafe_allow_html=True)


# ── Session state ─────────────────────────────────────────────────────────────
# Streamlit re-runs the entire script on every interaction.
# st.session_state is a persistent dictionary that survives those re-runs,
# acting as our in-memory "database" for the chat history and loaded index.
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []   # list of {question, answer, sources}
if "index" not in st.session_state:
    st.session_state.index = None        # the LlamaIndex VectorStoreIndex
if "doc_name" not in st.session_state:
    st.session_state.doc_name = None     # filename of the currently loaded PDF


# ── LlamaIndex global settings ────────────────────────────────────────────────
# These are set once and picked up by all LlamaIndex components automatically.
# Think of Settings as a config singleton — no need to pass llm/embed_model
# into every function call; LlamaIndex reads them from here.

# The Ollama integration talks to the local Ollama server (default port 11434).
# Change the model name to whatever you've pulled: mistral, phi3, gemma2, etc.
OLLAMA_MODEL = "llama3.2"   # ← change this to match your pulled model

Settings.llm = Ollama(
    model=OLLAMA_MODEL,
    request_timeout=120.0,   # local models can be slower; give them 2 minutes
)

# HuggingFace embeddings run locally on your CPU — no internet call needed
# after the first download. bge-small is fast and accurate enough for RAG.
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
)

# How the PDF text is split into chunks before embedding.
# chunk_size=512  → each chunk is ~512 tokens (~400 words)
# chunk_overlap=64 → chunks share 64 tokens at boundaries so context isn't lost
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=64)


# ── Core functions ────────────────────────────────────────────────────────────

@st.cache_resource(show_spinner=False)
def build_index(file_bytes: bytes, filename: str) -> VectorStoreIndex:
    """
    Ingest a PDF and build a searchable vector index.

    @st.cache_resource means Streamlit runs this only once per unique
    (file_bytes, filename) pair and reuses the result on re-runs.
    Without caching, re-indexing would happen on every UI interaction.

    Steps:
      1. Write the PDF bytes to a temp folder (SimpleDirectoryReader needs a path)
      2. Load and parse the PDF into LlamaIndex Document objects
      3. Build a VectorStoreIndex — this chunks the text, embeds each chunk,
         and stores the vectors in memory for similarity search
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir) / filename
        tmp_path.write_bytes(file_bytes)                      # save PDF to disk
        docs = SimpleDirectoryReader(tmpdir).load_data()      # parse PDF → Docs

    # VectorStoreIndex.from_documents does the heavy lifting:
    # it splits each doc into chunks (via Settings.node_parser),
    # embeds each chunk (via Settings.embed_model),
    # and stores them in an in-memory vector store.
    index = VectorStoreIndex.from_documents(docs)
    return index


def ask_manual(index: VectorStoreIndex, question: str) -> dict:
    """
    Run a RAG query against the indexed manual.

    How RAG works here:
      1. The question is embedded into a vector using the same embed model
      2. The top-k most similar chunks are retrieved from the index
      3. Those chunks are injected into the LLM prompt as context
      4. The LLM (Ollama) generates an answer grounded in that context

    similarity_top_k=4  → retrieve the 4 most relevant chunks
    response_mode="compact" → LlamaIndex fits as many chunks as possible
                              into a single LLM call (vs. tree/refine modes
                              which make multiple calls and are slower)
    """
    query_engine = index.as_query_engine(
        similarity_top_k=4,
        response_mode="compact",
    )
    response = query_engine.query(question)

    # response.source_nodes is a list of NodeWithScore objects —
    # each one is a retrieved chunk with its similarity score and metadata.
    # We extract page numbers and a short preview for the citation UI.
    sources = []
    for node in response.source_nodes:
        meta = node.node.metadata
        page = meta.get("page_label") or meta.get("page") or "?"
        sources.append({
            "page": page,
            "score": round(node.score or 0, 2),
            "snippet": node.node.text[:160].replace("\n", " ") + "…",
        })

    return {"answer": str(response), "sources": sources}


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚙️ Configuration")

    # Let the user pick which local model to use (must be pulled via ollama pull)
    model_choice = st.selectbox(
        "Ollama model",
        options=["llama3.2", "mistral", "phi3", "gemma2", "llama3.1"],
        index=0,
        help="Run `ollama pull <model>` first. Ollama must be running locally.",
    )
    # Update the global LLM if the user changes the dropdown
    if model_choice != OLLAMA_MODEL:
        Settings.llm = Ollama(model=model_choice, request_timeout=120.0)

    st.divider()
    st.markdown("### 📎 Upload Manual")
    uploaded = st.file_uploader(
        "Drop a PDF owners manual",
        type=["pdf"],
        help="Max ~50MB. Indexing takes ~10–30s depending on page count.",
    )

    if uploaded:
        if st.button("⚡ Index this manual", use_container_width=True):
            with st.spinner("Chunking & embedding pages…"):
                try:
                    idx = build_index(uploaded.read(), uploaded.name)
                    st.session_state.index = idx
                    st.session_state.doc_name = uploaded.name
                    st.session_state.chat_history = []   # fresh chat for new doc
                    st.success(f"✅ Indexed: **{uploaded.name}**")
                except Exception as e:
                    st.error(f"Indexing failed: {e}")

    st.divider()
    # Status indicator: green pill = manual loaded, amber = nothing loaded yet
    if st.session_state.doc_name:
        st.markdown(
            f'<span class="status-pill">📗 {st.session_state.doc_name}</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<span class="status-pill-warn">⚠ No manual loaded</span>',
            unsafe_allow_html=True,
        )

    st.divider()
    if st.button("🗑 Clear chat", use_container_width=True):
        st.session_state.chat_history = []
        st.rerun()

    st.markdown("""
    <div class="upload-hint">
    Week 1 · AI Portfolio Project<br>
    Stack: Python · LlamaIndex · Streamlit · Ollama
    </div>
    """, unsafe_allow_html=True)


# ── Main area ─────────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
  <h1>📖 Owners Manual AI</h1>
  <p>Upload any PDF manual → ask questions in plain English → get cited answers instantly. Runs 100% locally via Ollama.</p>
</div>
""", unsafe_allow_html=True)

# Render conversation history (oldest → newest, top → bottom)
for turn in st.session_state.chat_history:
    st.markdown(f'<div class="msg-user">🧑 {turn["question"]}</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="msg-ai">🤖 {turn["answer"]}</div>', unsafe_allow_html=True)
    if turn.get("sources"):
        for src in turn["sources"][:3]:   # show max 3 citations per answer
            st.markdown(
                f'<div class="citation-box">'
                f'<span>📄 Page {src["page"]}</span> · score {src["score"]} — '
                f'{src["snippet"]}'
                f'</div>',
                unsafe_allow_html=True,
            )

# Example question buttons — only shown before the first message
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
            st.session_state._prefill = ex
            st.rerun()

# Text input — supports prefill from the example buttons above
prefill = st.session_state.pop("_prefill", "")
question = st.text_input(
    "Ask anything about your manual…",
    value=prefill,
    placeholder="e.g. How often should I change the filter?",
    label_visibility="collapsed",
)

# When the user submits a question, run RAG and append to history
if question:
    if not st.session_state.index:
        st.warning("⚠ Please upload and index a PDF manual first.")
    else:
        with st.spinner(f"Searching manual with {model_choice}…"):
            try:
                result = ask_manual(st.session_state.index, question)
                st.session_state.chat_history.append({
                    "question": question,
                    "answer": result["answer"],
                    "sources": result["sources"],
                })
                st.rerun()   # re-render so the new turn appears in the chat
            except Exception as e:
                st.error(f"Query failed: {e}\n\nMake sure Ollama is running: `ollama serve`")
