"""
app.py — UI layer only.

All business logic lives in:
  models.py    — LLM + embedding config
  ingestion.py — PDF extraction + indexing
  skills.py    — tool calls + skill router

Run:
    streamlit run app.py
"""

import streamlit as st
from models    import configure_settings
from ingestion import build_index, get_page_text
from skills    import run_skill, SemanticSkillRouter, SKILL_LABELS


# ─────────────────────────────────────────────────────────────────────────────
# BOOT
# ─────────────────────────────────────────────────────────────────────────────
configure_settings()   # sets LlamaIndex global Settings once

# Semantic router is built once per session in session state using SemanticSkillRouter.

st.set_page_config(
    page_title="Owners Manual AI",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ─────────────────────────────────────────────────────────────────────────────
# FORCE SIDEBAR OPEN — JS + CSS
# ─────────────────────────────────────────────────────────────────────────────
_SIDEBAR_JS = """
<script>
(function keepSidebarOpen() {
    function forceOpen() {
        document.querySelectorAll(
            '[data-testid="stSidebarCollapseButton"],[data-testid="collapsedControl"]'
        ).forEach(el => { el.style.display = 'none'; });
    }
    forceOpen();
    new MutationObserver(forceOpen).observe(document.body,
        { childList: true, subtree: true });
})();
</script>
"""


# ─────────────────────────────────────────────────────────────────────────────
# CSS
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Geist:wght@400;500;600&display=swap');

html, body, [class*="css"] { font-family:'Geist',sans-serif; background:#131313; color:#e5e2e1; }

/* Streamlit chrome */
#MainMenu, footer, header { visibility:hidden; }
.block-container { padding:0 !important; max-width:100% !important; }

/* Sidebar — always open */
button[data-testid="stSidebarCollapseButton"],
button[data-testid="collapsedControl"] { display:none !important; }

section[data-testid="stSidebar"] {
    transform:translateX(0) !important;
    width:280px !important; min-width:280px !important;
    background:#131313 !important;
    border-right:1px solid #3b4b3d !important;
    visibility:visible !important;
    position:relative !important;
    flex-shrink:0 !important;
}
section[data-testid="stSidebar"] > div { padding:24px 20px !important; width:280px !important; }
.main .block-container, section.main > div {
    margin-left:0 !important; padding-left:0 !important;
    padding-right:0 !important; max-width:100% !important;
}

/* ── Sidebar components ── */
.sidebar-logo { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
.logo-dot { width:10px; height:10px; border-radius:50%; background:#00ff88; box-shadow:0 0 8px #00ff88; flex-shrink:0; }
.logo-text { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; letter-spacing:.05em; color:#e5e2e1; }

.lib-header { display:flex; justify-content:space-between; margin-bottom:10px; }
.lib-label { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.08em; color:#b9cbb9; opacity:.6; text-transform:uppercase; }

.file-card { background:#201f1f; border:1px solid #3b4b3d; border-radius:8px; padding:12px; margin-bottom:20px; }
.file-card:hover { border-color:#00ff88; }
.file-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.file-name { font-family:'JetBrains Mono',monospace; font-size:11px; color:#e5e2e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
.file-size { font-family:'JetBrains Mono',monospace; font-size:10px; color:#b9cbb9; flex-shrink:0; }
.file-status { display:flex; align-items:center; gap:6px; margin-top:8px; }
.status-dot { width:6px; height:6px; border-radius:50%; background:#00ff88; }
.status-text { font-family:'JetBrains Mono',monospace; font-size:10px; color:#00ff88; letter-spacing:.05em; }

/* ── Context header ── */
.context-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; border-bottom:1px solid #3b4b3d; background:#131313; }
.context-label { font-family:'JetBrains Mono',monospace; font-size:12px; color:#b9cbb9; letter-spacing:.05em; }
.context-pill { display:flex; align-items:center; gap:6px; background:#201f1f; border:1px solid #3b4b3d; padding:3px 10px; border-radius:4px; }
.context-pill-text { font-family:'JetBrains Mono',monospace; font-size:11px; color:#e5e2e1; }
.offline-badge { display:flex; align-items:center; gap:6px; background:#1c1b1b; border:1px solid #3b4b3d; padding:3px 10px; border-radius:4px; }
.offline-dot { width:6px; height:6px; border-radius:50%; background:#00ff88; }
.offline-text { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.08em; color:#e5e2e1; }

/* ── Skill badge shown on AI messages ── */
.skill-badge {
    display:inline-flex; align-items:center; gap:5px;
    font-family:'JetBrains Mono',monospace; font-size:9px;
    letter-spacing:.08em; text-transform:uppercase;
    color:#00ff88; background:rgba(0,255,136,.08);
    border:1px solid rgba(0,255,136,.2); border-radius:4px;
    padding:2px 8px; margin-bottom:8px;
}

/* ── Chat messages ── */
.msg-user { display:flex; justify-content:flex-end; margin:16px 0; }
.msg-user-bubble { max-width:80%; background:#2a2a2a; border:1px solid #3b4b3d; border-radius:12px 12px 4px 12px; padding:12px 16px; font-size:14px; line-height:22px; color:#e5e2e1; }

.msg-ai { display:flex; gap:12px; margin:16px 0; }
.ai-avatar { width:32px; height:32px; border-radius:4px; border:1px solid #00ff88; background:rgba(0,255,136,.1); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; color:#00ff88; }
.ai-body { flex:1; }
.ai-bubble { background:#201f1f; border:1px solid #3b4b3d; border-radius:4px 12px 12px 12px; padding:16px; font-size:14px; line-height:22px; color:#e5e2e1; white-space:pre-wrap; }

.cite-pill { display:inline-flex; align-items:center; gap:6px; margin-top:8px; margin-right:4px; padding:4px 10px; border:1px solid #3b4b3d; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:10px; color:#b9cbb9; }

/* ── Empty state ── */
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; gap:12px; text-align:center; }
.empty-icon { font-size:40px; opacity:.4; }
.empty-title { font-size:16px; font-weight:600; color:#e5e2e1; opacity:.5; }
.empty-sub { font-size:13px; color:#b9cbb9; opacity:.4; max-width:300px; }

/* ── Preview panel ── */
.preview-header { padding:10px 16px; border-bottom:1px solid #3b4b3d; display:flex; justify-content:space-between; align-items:center; }
.preview-subheader { padding:6px 16px; border-bottom:1px solid #3b4b3d; background:#1c1b1b; display:flex; justify-content:space-between; }
.preview-mono-sm { font-family:'JetBrains Mono',monospace; font-size:10px; color:#b9cbb9; opacity:.5; letter-spacing:.05em; text-transform:uppercase; }
.preview-content { background:#f5f5f0; color:#1a1a1a; padding:32px; border-radius:4px; font-family:Georgia,serif; line-height:1.8; font-size:13px; margin:16px; min-height:400px; }
.hl-yellow { background:rgba(238,152,0,.2); border-bottom:2px solid #ee9800; padding:0 2px; }

/* ── Footer ── */
.footer-bar { text-align:center; padding:10px; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.15em; color:#b9cbb9; opacity:.3; text-transform:uppercase; border-top:1px solid #3b4b3d; }

/* ── Streamlit widget overrides ── */
div[data-testid="stTextInput"] input {
    background:#201f1f !important; border:1px solid #3b4b3d !important;
    border-radius:12px !important; color:#e5e2e1 !important;
    font-family:'Geist',sans-serif !important; font-size:14px !important;
    padding:14px 16px !important;
}
div[data-testid="stTextInput"] input:focus { border-color:#00ff88 !important; box-shadow:0 0 0 1px #00ff88 !important; }

div[data-testid="stButton"] button {
    background:rgba(0,255,136,.08) !important; border:1px solid rgba(0,255,136,.25) !important;
    color:#00ff88 !important; border-radius:6px !important;
    font-family:'JetBrains Mono',monospace !important;
    font-size:11px !important; letter-spacing:.05em !important;
}
div[data-testid="stButton"] button:hover { background:#00ff88 !important; color:#003919 !important; }

div[data-testid="stFileUploader"] {
    background:#1c1b1b !important; border:2px dashed #3b4b3d !important; border-radius:12px !important; padding:16px !important;
}
div[data-testid="stFileUploader"]:hover { border-color:#00ff88 !important; }

::-webkit-scrollbar { width:4px; }
::-webkit-scrollbar-track { background:#0a0a0a; }
::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
</style>
""", unsafe_allow_html=True)

st.markdown(_SIDEBAR_JS, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# SESSION STATE
# ─────────────────────────────────────────────────────────────────────────────
for key, default in {
    "chat_history":     [],
    "index":            None,
    "doc_name":         None,
    "doc_bytes":        None,
    "pending_question": None,
    "indexed_file":     None,   # tracks which filename is already indexed
    "router":           None,   # SemanticSkillRouter — built once at startup
}.items():
    if key not in st.session_state:
        st.session_state[key] = default


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div class="sidebar-logo">
        <div class="logo-dot"></div>
        <span class="logo-text">OWNERS MANUAL AI</span>
    </div>
    """, unsafe_allow_html=True)

    file_count = 1 if st.session_state.doc_name else 0
    st.markdown(f"""
    <div class="lib-header">
        <span class="lib-label">Active Library</span>
        <span class="lib-label">{file_count} FILES</span>
    </div>
    """, unsafe_allow_html=True)

    # ── File card ──
    if st.session_state.doc_name:
        name     = st.session_state.doc_name
        size_kb  = len(st.session_state.doc_bytes or b"") // 1024
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

    # ── Upload — auto-index on upload ──
    uploaded = st.file_uploader(
        "Drop manual to index",
        type=["pdf"],
        label_visibility="collapsed",
        help="PDF up to 15 MB. Indexed automatically on upload.",
    )

    if uploaded:
        # Only re-index if a NEW file is uploaded (different filename)
        if uploaded.name != st.session_state.indexed_file:
            file_bytes = uploaded.read()
            with st.spinner("Indexing pages…"):
                try:
                    idx = build_index(file_bytes, uploaded.name)
                    st.session_state.index        = idx
                    st.session_state.doc_name     = uploaded.name
                    st.session_state.doc_bytes    = file_bytes
                    st.session_state.chat_history = []
                    st.session_state.indexed_file = uploaded.name
                    st.toast(f"✅ {uploaded.name} indexed", icon="📄")
                except Exception as e:
                    st.error(f"Indexing failed: {e}")

    st.divider()

    # ── Active skill display ──
    st.markdown("""
    <div style="margin-bottom:6px;">
        <span style="font-family:'JetBrains Mono',monospace; font-size:10px;
                     letter-spacing:.08em; color:#b9cbb9; opacity:.6; text-transform:uppercase;">
            SKILLS
        </span>
    </div>
    """, unsafe_allow_html=True)

    for skill_key, skill_label in SKILL_LABELS.items():
        st.markdown(f"""
        <div style="font-family:'JetBrains Mono',monospace; font-size:10px;
                    color:#b9cbb9; padding:3px 0; opacity:.7;">
            {skill_label}
        </div>
        """, unsafe_allow_html=True)

    st.divider()

    if st.button("Clear Chat", use_container_width=True):
        st.session_state.chat_history = []
        st.rerun()

    st.markdown("""
    <div style="padding-top:16px; display:flex; align-items:center; gap:6px; opacity:.35;">
        <span style="font-size:12px;">💾</span>
        <span style="font-family:'JetBrains Mono',monospace; font-size:9px;
                     letter-spacing:.12em; text-transform:uppercase; color:#b9cbb9;">
            Local-First Web Storage
        </span>
    </div>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# BUILD SEMANTIC ROUTER (once per session, after LlamaIndex Settings are ready)
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.router is None:
    with st.spinner("Initialising semantic router…"):
        try:
            st.session_state.router = SemanticSkillRouter()
        except Exception as e:
            st.warning(f"Router init failed: {e}. Falling back to general Q&A.")
            st.session_state.router = None


# ─────────────────────────────────────────────────────────────────────────────
# PROCESS PENDING QUESTION (before UI renders to avoid duplicate submission)
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.pending_question and st.session_state.index:
    q = st.session_state.pending_question
    st.session_state.pending_question = None

    with st.spinner("Running skill…"):
        try:
            if st.session_state.router is None:
                result = run_skill(st.session_state.index, q, None, force_skill="general_qa")
            else:
                result = run_skill(st.session_state.index, q, st.session_state.router)
            st.session_state.chat_history.append({
                "question":    q,
                "answer":      result["answer"],
                "sources":     result["sources"],
                "skill_label": result["skill_label"],
            })
        except Exception as e:
            st.error(f"Query failed: {e}\n\nIs Ollama running? Try: `ollama serve`")
    st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN LAYOUT — chat (3) | preview (2)
# ─────────────────────────────────────────────────────────────────────────────
col_chat, col_preview = st.columns([3, 2])


# ── CHAT COLUMN ──────────────────────────────────────────────────────────────
with col_chat:
    doc_label = st.session_state.doc_name or "No document loaded"
    st.markdown(f"""
    <div class="context-bar">
        <div style="display:flex;align-items:center;gap:12px;">
            <span class="context-label">Context:</span>
            <div class="context-pill">
                <span style="color:#00ff88;font-size:13px;">📄</span>
                <span class="context-pill-text">{doc_label}</span>
            </div>
        </div>
        <div class="offline-badge">
            <div class="offline-dot"></div>
            <span class="offline-text">100% OFFLINE</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Empty state ──
    if not st.session_state.chat_history:
        st.markdown("""
        <div class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="empty-title">Owners Manual RAG Sandbox</div>
            <div class="empty-sub">
                Drop a PDF in the sidebar — it indexes automatically.<br>
                Then ask anything about your manual.
            </div>
        </div>
        """, unsafe_allow_html=True)

    # ── Chat history ──
    for turn in st.session_state.chat_history:
        st.markdown(f"""
        <div class="msg-user">
            <div class="msg-user-bubble">{turn["question"]}</div>
        </div>
        """, unsafe_allow_html=True)

        cite_pills = "".join(
            f'<span class="cite-pill">📄 Page {s["page"]}</span>'
            for s in turn.get("sources", [])[:3]
        )
        conf = turn.get("confidence", "")
        conf_str = f' · {conf:.0%}' if isinstance(conf, float) else ""
        skill_badge = f'<div class="skill-badge">{turn.get("skill_label","💬 General Q&A")}{conf_str}</div>'

        st.markdown(f"""
        <div class="msg-ai">
            <div class="ai-avatar">AI</div>
            <div class="ai-body">
                {skill_badge}
                <div class="ai-bubble">{turn["answer"]}</div>
                <div style="margin-top:8px;">{cite_pills}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # ── Example prompts ──
    if st.session_state.index and not st.session_state.chat_history:
        st.markdown("<div style='margin-top:16px'></div>", unsafe_allow_html=True)
        examples = [
            "What are the maintenance intervals?",
            "What do the warning lights mean?",
            "My device won't start — how do I fix it?",
            "What are the technical specifications?",
        ]
        c1, c2 = st.columns(2)
        for i, ex in enumerate(examples):
            if (c1 if i % 2 == 0 else c2).button(ex, key=f"ex_{i}", use_container_width=True):
                st.session_state.pending_question = ex
                st.rerun()

    # ── Input ──
    st.markdown("<div style='padding:12px 0 4px'></div>", unsafe_allow_html=True)
    question = st.text_input(
        "input",
        value="",
        placeholder="Ask about maintenance, warning lights, or features...",
        label_visibility="collapsed",
        key="question_input",
    )
    if question:
        if not st.session_state.index:
            st.warning("Upload a PDF first — it will index automatically.")
        else:
            st.session_state.pending_question = question
            st.rerun()

    st.markdown("""
    <div class="footer-bar">
        LOCAL OFFLINE INFERENCE &nbsp;•&nbsp; GPU ACCELERATOR ENGINE V1.0.4
    </div>
    """, unsafe_allow_html=True)


# ── PREVIEW COLUMN ────────────────────────────────────────────────────────────
with col_preview:
    if not st.session_state.doc_bytes:
        st.markdown("""
        <div style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;padding:48px 24px;min-height:400px;
                    border-left:1px solid #3b4b3d;">
            <div style="opacity:.15;font-size:36px;margin-bottom:12px;">📄</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;
                        letter-spacing:.1em;color:#b9cbb9;opacity:.35;
                        text-transform:uppercase;text-align:center;line-height:1.8;">
                PDF preview will<br>appear here
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        # Determine which page to show — last cited page or page 1
        last_page = 1
        if st.session_state.chat_history:
            last_turn = st.session_state.chat_history[-1]
            if last_turn.get("sources"):
                try:
                    last_page = int(last_turn["sources"][0]["page"])
                except (ValueError, TypeError):
                    last_page = 1

        page_text, total_pages = get_page_text(st.session_state.doc_bytes, last_page)

        # Highlight cited snippets in the preview
        highlighted = page_text.replace("\n", "<br>")
        if st.session_state.chat_history:
            for src in st.session_state.chat_history[-1].get("sources", [])[:2]:
                snippet = src["snippet"][:60].strip()
                if snippet and snippet in highlighted:
                    highlighted = highlighted.replace(
                        snippet,
                        f'<span class="hl-yellow">{snippet}</span>',
                        1,
                    )

        ref_id = st.session_state.doc_name[:20].upper().replace(" ", "_")
        st.markdown(f"""
        <div class="preview-header">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#00ff88;">📄</span>
                <span style="font-family:'JetBrains Mono',monospace;font-size:11px;
                             color:#e5e2e1;overflow:hidden;text-overflow:ellipsis;
                             white-space:nowrap;max-width:200px;">
                    {st.session_state.doc_name}
                </span>
            </div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#b9cbb9;">
                Page {last_page} of {total_pages}
            </span>
        </div>
        <div class="preview-subheader">
            <span class="preview-mono-sm">SECURE LOCAL PARSER V2</span>
            <span class="preview-mono-sm">INDEX_REF_{ref_id}</span>
        </div>
        <div style="overflow-y:auto;padding:16px;">
            <div class="preview-content">
                <div style="display:flex;justify-content:space-between;margin-bottom:24px;
                            border-bottom:1px solid rgba(0,0,0,.1);padding-bottom:8px;">
                    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(0,0,0,.35);">
                        SECURE LOCAL PARSER V2
                    </span>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(0,0,0,.35);">
                        PAGE {last_page}
                    </span>
                </div>
                <div style="font-size:13px;line-height:1.9;">{highlighted}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)