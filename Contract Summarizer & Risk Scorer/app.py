"""
Week 2: Contract Summarizer & Risk Scorer
Stack: Python · Streamlit · PyMuPDF · Ollama (mistral:7b)

Setup:
    pip install streamlit pymupdf ollama
    ollama pull mistral:7b
    streamlit run app.py
"""

import json

import streamlit as st

from lib.analyzer import (
    extract_pdf_text,
    analyze_contract,
    risk_class,
    bar_color,
    risk_label_text,
)

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ContractIQ · Risk Scorer",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700&display=swap');

/* ── Base ── */
html, body, [class*="css"] {
    font-family: 'Syne', sans-serif;
}
.stApp {
    background-color: #F5F1EB;
}

/* ── Header ── */
.app-header {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #2C2416;
}
.app-title {
    font-family: 'Libre Baskerville', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #2C2416;
    letter-spacing: -0.02em;
}
.app-sub {
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    color: #8B7355;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

/* ── Overall risk badge ── */
.risk-banner {
    border-radius: 4px;
    padding: 1.5rem 2rem;
    margin: 1.5rem 0;
    display: flex;
    align-items: center;
    gap: 2rem;
}
.risk-banner.low    { background: #E8F4E8; border-left: 4px solid #2D7A2D; }
.risk-banner.medium { background: #FFF7E0; border-left: 4px solid #C07C00; }
.risk-banner.high   { background: #FDECEC; border-left: 4px solid #C0392B; }
.risk-score-num {
    font-family: 'Libre Baskerville', serif;
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
}
.risk-score-num.low    { color: #2D7A2D; }
.risk-score-num.medium { color: #C07C00; }
.risk-score-num.high   { color: #C0392B; }
.risk-label {
    font-size: 0.75rem;
    font-family: 'DM Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #8B7355;
}
.risk-summary-text {
    font-family: 'Libre Baskerville', serif;
    font-size: 0.95rem;
    color: #2C2416;
    line-height: 1.65;
    flex: 1;
}

/* ── Concern chips ── */
.concern-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 1rem 0; }
.chip {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    padding: 3px 10px;
    border-radius: 2px;
    background: #2C2416;
    color: #F5F1EB;
    letter-spacing: 0.06em;
}

/* ── Section title ── */
.section-title {
    font-family: 'Libre Baskerville', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #2C2416;
    margin: 2rem 0 1rem 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #D4C9B8;
}

/* ── Clause card ── */
.clause-card {
    background: #FDFAF6;
    border: 1px solid #E0D8CC;
    border-radius: 4px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    position: relative;
}
.clause-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 4px 0 0 4px;
}
.clause-card.risk-low::before    { background: #2D7A2D; }
.clause-card.risk-medium::before { background: #C07C00; }
.clause-card.risk-high::before   { background: #C0392B; }

.clause-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
}
.clause-title {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    color: #2C2416;
}
.clause-category {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8B7355;
    background: #EDE7DB;
    padding: 2px 8px;
    border-radius: 2px;
}
.clause-score {
    font-family: 'Libre Baskerville', serif;
    font-size: 1.4rem;
    font-weight: 700;
}
.clause-score.risk-low    { color: #2D7A2D; }
.clause-score.risk-medium { color: #C07C00; }
.clause-score.risk-high   { color: #C0392B; }

.score-bar-bg {
    height: 4px;
    background: #E0D8CC;
    border-radius: 2px;
    margin: 8px 0 12px 0;
    overflow: hidden;
}
.score-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
}

.clause-plain {
    font-family: 'Libre Baskerville', serif;
    font-size: 0.88rem;
    color: #2C2416;
    line-height: 1.6;
    margin-bottom: 0.6rem;
}
.clause-reason {
    font-size: 0.8rem;
    color: #6B5D4A;
    line-height: 1.5;
    font-style: italic;
}
.clause-flags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 0.75rem;
}
.flag-chip {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 2px;
    letter-spacing: 0.05em;
}
.flag-chip.risk-low    { background: #E8F4E8; color: #2D7A2D; border: 1px solid #B8D8B8; }
.flag-chip.risk-medium { background: #FFF7E0; color: #C07C00; border: 1px solid #E8D080; }
.flag-chip.risk-high   { background: #FDECEC; color: #C0392B; border: 1px solid #E8AAAA; }

/* ── Sidebar ── */
.stSidebar { background-color: #EDE7DB !important; }

/* ── Input area ── */
.stTextArea textarea {
    font-family: 'DM Mono', monospace !important;
    font-size: 0.8rem !important;
    background: #FDFAF6 !important;
    border: 1px solid #D4C9B8 !important;
    border-radius: 4px !important;
    color: #2C2416 !important;
}

/* ── Buttons ── */
.stButton > button {
    background-color: #2C2416 !important;
    color: #F5F1EB !important;
    border: none !important;
    border-radius: 3px !important;
    font-family: 'DM Mono', monospace !important;
    font-size: 0.8rem !important;
    letter-spacing: 0.08em !important;
    padding: 0.6rem 2rem !important;
    text-transform: uppercase !important;
}
.stButton > button:hover {
    background-color: #4A3C28 !important;
}

/* ── Progress ── */
.stProgress > div > div { background-color: #2C2416 !important; }

/* ── Expander ── */
details summary {
    font-family: 'DM Mono', monospace !important;
    font-size: 0.75rem !important;
    color: #8B7355 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    cursor: pointer;
}

/* ── Footer ── */
.footer-note {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: #B0A090;
    text-align: center;
    margin-top: 3rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}
</style>
""", unsafe_allow_html=True)


# ── Helpers & analysis logic imported from lib/analyzer.py ──────────────────
# extract_pdf_text, analyze_contract, risk_class, bar_color, risk_label_text,
# SYSTEM_PROMPT are all imported at the top of this file.


# ── UI: Sidebar ───────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("### ⚖️ ContractIQ")
    st.markdown("---")

    st.markdown("**Model**")
    model_choice = st.selectbox(
        "Ollama model",
        ["mistral:7b", "mistral:latest", "llama3.1:8b", "llama3:8b", "phi3:medium"],
        help="mistral:7b is best for structured JSON output",
        label_visibility="collapsed",
    )

    st.markdown("---")
    st.markdown("**Risk thresholds**")
    low_thresh = st.slider("Low → Medium cutoff", 1, 5, 3)
    med_thresh = st.slider("Medium → High cutoff", 4, 9, 6)

    st.markdown("---")
    st.markdown("""
**Risk categories**
- 🔴 Indemnity
- 🔴 Liability
- 🟡 Termination
- 🟡 IP / Ownership
- 🟡 Exclusivity
- 🟢 Payment
- 🟢 Governing Law
""")
    st.markdown("---")
    st.caption("mistral:7b recommended · Run `ollama pull mistral:7b`")


# ── UI: Main ──────────────────────────────────────────────────────────────────

st.markdown("""
<div class="app-header">
  <div class="app-title">ContractIQ</div>
  <div class="app-sub">Contract Summarizer & Risk Scorer · Week 2</div>
</div>
""", unsafe_allow_html=True)

# Input section
col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.markdown("**Upload a contract PDF**")
    uploaded_file = st.file_uploader(
        "PDF", type=["pdf"], label_visibility="collapsed"
    )
    if uploaded_file:
        st.success(f"✓ {uploaded_file.name} loaded")

with col2:
    st.markdown("**Or paste contract text**")
    pasted_text = st.text_area(
        "Contract text",
        height=160,
        placeholder="Paste NDA, freelance agreement, SaaS contract...",
        label_visibility="collapsed",
    )

# Sample contracts for easy demo
with st.expander("Load a sample contract for demo"):
    sample = st.selectbox("Choose sample", [
        "— select —",
        "NDA (non-disclosure agreement)",
        "Freelance services agreement",
        "SaaS subscription terms",
    ])
    if sample != "— select —":
        samples = {
            "NDA (non-disclosure agreement)": """NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date last signed below between DisclosingParty Inc. ("Disclosing Party") and Recipient LLC ("Receiving Party").

1. CONFIDENTIAL INFORMATION
The Receiving Party agrees to hold in strict confidence and not to disclose to any third party any Confidential Information of the Disclosing Party. Confidential Information includes all technical, business, financial, and operational information disclosed in any form.

2. OBLIGATIONS
The Receiving Party shall: (a) protect Confidential Information with at least the same degree of care it uses for its own confidential information, but no less than reasonable care; (b) use Confidential Information solely for evaluating a potential business relationship; (c) not reverse engineer any software or technology disclosed.

3. TERM
This Agreement shall remain in effect for a period of five (5) years from the date of signing. The obligations of confidentiality shall survive termination for an additional ten (10) years.

4. INDEMNIFICATION
The Receiving Party shall indemnify, defend, and hold harmless the Disclosing Party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from any breach of this Agreement by the Receiving Party or its employees, contractors, or agents, regardless of whether such breach was intentional.

5. REMEDIES
The Receiving Party acknowledges that any breach of this Agreement would cause irreparable harm for which monetary damages would be inadequate, and the Disclosing Party shall be entitled to seek equitable relief without bond or other security.

6. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the courts of Delaware, and Receiving Party waives any objection to such jurisdiction.

7. ASSIGNMENT
This Agreement may not be assigned by the Receiving Party without prior written consent of the Disclosing Party. The Disclosing Party may assign this Agreement freely without notice.

8. INJUNCTIVE RELIEF
The parties agree that breach of this Agreement will cause irreparable injury and that the Disclosing Party is entitled to seek injunctive relief in any court of competent jurisdiction to prevent actual or threatened breach, without the requirement to post a bond.

Signed: DisclosingParty Inc. / Recipient LLC""",

            "Freelance services agreement": """FREELANCE SERVICES AGREEMENT

This Agreement is between ClientCorp ("Client") and Freelancer ("Contractor").

1. SERVICES
Contractor agrees to provide software development services as directed by Client from time to time. Client may modify the scope of work at any time with or without notice. Contractor agrees to make revisions as many times as required by Client at no additional charge.

2. PAYMENT
Client shall pay Contractor $75 per hour within 90 days of invoice submission. Late payments incur no interest. Client reserves the right to dispute any invoice within 180 days of receipt and withhold payment during the dispute period.

3. INTELLECTUAL PROPERTY
All work product, inventions, code, designs, and deliverables created by Contractor under this Agreement, whether or not created during working hours or using Contractor's own equipment, shall be the exclusive property of Client. Contractor irrevocably assigns all present and future IP rights to Client worldwide. Contractor waives all moral rights.

4. NON-COMPETE
For a period of 24 months following termination of this Agreement, Contractor shall not directly or indirectly engage in any business that competes with Client in any market where Client operates or plans to operate, anywhere in the world.

5. NON-SOLICITATION
Contractor shall not solicit or accept work from any of Client's customers, clients, or business partners for a period of 36 months following termination.

6. TERMINATION
Client may terminate this Agreement immediately without cause and without payment for work in progress. Contractor must provide 60 days' written notice to terminate.

7. LIABILITY
Contractor's total liability for any claims shall not exceed $100. Client's liability is unlimited.

8. INDEMNIFICATION
Contractor shall fully indemnify Client for any third-party claims arising from Contractor's work, including patent, copyright, or trade secret claims, even where Client directed the work.""",

            "SaaS subscription terms": """SOFTWARE AS A SERVICE SUBSCRIPTION AGREEMENT

1. SERVICES
Provider grants Customer a non-exclusive, non-transferable license to access the SaaS platform during the subscription term. Provider may modify features with 30 days notice.

2. FEES AND PAYMENT
Customer shall pay all fees in advance. Fees are non-refundable under any circumstances, including service outages or termination. Provider may increase fees annually by up to 15% with 30 days notice.

3. DATA
Customer grants Provider a perpetual, irrevocable license to use, copy, and process Customer Data to improve Provider's services and products. Provider may share anonymized Customer Data with third parties. Customer retains ownership of Customer Data but acknowledges Provider may retain copies after termination.

4. SERVICE LEVELS
Provider targets 99% uptime but makes no binding guarantee. In the event of downtime, Customer's sole remedy is service credits not to exceed one month's fees.

5. LIMITATION OF LIABILITY
IN NO EVENT SHALL PROVIDER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. PROVIDER'S TOTAL LIABILITY SHALL NOT EXCEED THE FEES PAID IN THE THREE MONTHS PRIOR TO THE CLAIM.

6. INDEMNIFICATION
Customer shall indemnify Provider from all third-party claims arising from Customer's use of the services. Provider's indemnification of Customer is limited to claims of IP infringement where Provider has received written notice and had 90 days to cure.

7. AUTO-RENEWAL
Subscriptions auto-renew for successive 12-month terms unless Customer provides written notice 90 days before renewal date. Cancellation after renewal is non-refundable.

8. GOVERNING LAW
This Agreement is governed by the laws of England and Wales. All disputes shall be resolved by binding arbitration in London."""
        }
        pasted_text = samples[sample]
        st.info(f"Sample loaded: **{sample}**")

st.markdown("<br>", unsafe_allow_html=True)
analyze_btn = st.button("⚖️ ANALYZE CONTRACT")

# ── Analysis ──────────────────────────────────────────────────────────────────

if analyze_btn:
    # Determine source text
    contract_text = ""
    if uploaded_file:
        contract_text = extract_pdf_text(uploaded_file.read())
    elif pasted_text.strip():
        contract_text = pasted_text.strip()
    else:
        st.warning("Please upload a PDF or paste contract text first.")
        st.stop()

    if len(contract_text) < 50:
        st.error("Contract text is too short to analyze.")
        st.stop()

    # Run analysis
    with st.spinner("Analyzing contract with Ollama..."):
        progress = st.progress(0)
        try:
            progress.progress(20)
            result = analyze_contract(contract_text, model_choice)
            progress.progress(100)
        except json.JSONDecodeError as e:
            st.error(f"Model returned malformed JSON. Try again or switch to mistral:7b.\n\n{e}")
            st.stop()
        except Exception as e:
            st.error(f"Ollama error: {e}\n\nMake sure Ollama is running (`ollama serve`) and the model is pulled.")
            st.stop()
        finally:
            progress.empty()

    # ── Overall risk banner ──
    overall = result.get("overall_risk_score", 5)
    rc = risk_class(overall)
    label = risk_label_text(overall)
    summary = result.get("overall_summary", "No summary generated.")

    st.markdown(f"""
    <div class="risk-banner {rc}">
      <div style="text-align:center; min-width:80px;">
        <div class="risk-score-num {rc}">{overall}</div>
        <div class="risk-label">/10</div>
        <div class="risk-label" style="margin-top:4px">{label}</div>
      </div>
      <div class="risk-summary-text">{summary}</div>
    </div>
    """, unsafe_allow_html=True)

    # ── Key concerns ──
    concerns = result.get("key_concerns", [])
    if concerns:
        chips_html = "".join([f'<span class="chip">{c}</span>' for c in concerns])
        st.markdown(f'<div class="concern-chips">{chips_html}</div>', unsafe_allow_html=True)

    # ── Metrics row ──
    clauses = result.get("clauses", [])
    if clauses:
        scores = [c.get("risk_score", 5) for c in clauses]
        high_count = sum(1 for s in scores if s > med_thresh)
        med_count = sum(1 for s in scores if low_thresh < s <= med_thresh)
        low_count = sum(1 for s in scores if s <= low_thresh)

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Clauses analyzed", len(clauses))
        m2.metric("🔴 High risk", high_count)
        m3.metric("🟡 Medium risk", med_count)
        m4.metric("🟢 Low risk", low_count)

    # ── Clause breakdown ──
    st.markdown('<div class="section-title">Clause-by-Clause Breakdown</div>', unsafe_allow_html=True)

    if not clauses:
        st.info("No clauses were extracted. The model may need a more detailed contract.")
    else:
        # Sort by risk score descending
        clauses_sorted = sorted(clauses, key=lambda x: x.get("risk_score", 0), reverse=True)

        for clause in clauses_sorted:
            score = clause.get("risk_score", 5)
            rc2 = risk_class(score)
            title = clause.get("title", "Unnamed Clause")
            category = clause.get("category", "other")
            plain = clause.get("plain_english", "")
            reason = clause.get("risk_reason", "")
            flags = clause.get("risk_flags", [])
            fill_pct = score * 10

            flags_html = "".join([
                f'<span class="flag-chip risk-{rc2}">{f}</span>'
                for f in flags
            ])

            st.markdown(f"""
            <div class="clause-card risk-{rc2}">
              <div class="clause-header">
                <div>
                  <div class="clause-title">{title}</div>
                  <span class="clause-category">{category}</span>
                </div>
                <div style="text-align:right">
                  <div class="clause-score risk-{rc2}">{score}<span style="font-size:0.8rem;font-family:'DM Mono',monospace;color:#8B7355">/10</span></div>
                  <div class="risk-label">{risk_label_text(score)}</div>
                </div>
              </div>
              <div class="score-bar-bg">
                <div class="score-bar-fill" style="width:{fill_pct}%;background:{bar_color(score)};"></div>
              </div>
              <div class="clause-plain">{plain}</div>
              <div class="clause-reason">⚠ {reason}</div>
              {f'<div class="clause-flags">{flags_html}</div>' if flags_html else ''}
            </div>
            """, unsafe_allow_html=True)

    # ── Raw text toggle ──
    with st.expander("View extracted contract text"):
        st.text(contract_text[:3000] + ("..." if len(contract_text) > 3000 else ""))

    # ── Export ──
    export_lines = [
        "CONTRACT RISK ANALYSIS REPORT",
        "=" * 50,
        f"Overall Risk Score: {overall}/10 — {risk_label_text(overall)}",
        "",
        "SUMMARY",
        summary,
        "",
        "KEY CONCERNS",
        *[f"  · {c}" for c in concerns],
        "",
        "CLAUSE BREAKDOWN",
    ]
    for c in clauses_sorted:
        export_lines += [
            "",
            f"[{c.get('risk_score',0)}/10] {c.get('title','')} ({c.get('category','')})",
            f"  {c.get('plain_english','')}",
            f"  Risk: {c.get('risk_reason','')}",
            f"  Flags: {', '.join(c.get('risk_flags',[]))}",
        ]
    export_text = "\n".join(export_lines)

    st.download_button(
        "⬇ Export report as .txt",
        data=export_text,
        file_name="contract_risk_report.txt",
        mime="text/plain",
    )

# ── Footer ───────────────────────────────────────────────────────────────────
st.markdown("""
<div class="footer-note">
  ContractIQ · Week 2 Portfolio Project · Not legal advice · Powered by Ollama + mistral:7b
</div>
""", unsafe_allow_html=True)