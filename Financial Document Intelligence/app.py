"""
app.py
Streamlit UI that ties together:
  - synthetic_data   → generate sample statement
  - transaction_parser → parse uploaded or synthetic CSV
  - categorizer      → LLM-powered transaction categorisation
  - aggregator       → pandas summary tables

Run with:
    streamlit run app.py
"""

import io
import time
import streamlit as st
import pandas as pd

from synthetic_data import generate_statement
from transaction_parser import parse_csv, summary_stats
from categorizer import batch_categorize
from aggregator import (
    category_totals,
    monthly_summary,
    monthly_by_category,
    top_merchants,
    income_summary,
    spending_summary,
)

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="FinLens · Bank Statement Analyser",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

html, body, [class*="css"] {
    font-family: 'DM Sans', sans-serif;
}

h1, h2, h3 {
    font-family: 'DM Serif Display', serif;
    letter-spacing: -0.02em;
}

/* KPI cards */
.kpi-card {
    background: linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 8px;
}
.kpi-label {
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
}
.kpi-value {
    font-family: 'DM Serif Display', serif;
    font-size: 1.9rem;
    color: #f9fafb;
    line-height: 1.1;
}
.kpi-sub {
    font-size: 0.78rem;
    color: #4ade80;
    margin-top: 4px;
}
.kpi-sub.negative {
    color: #f87171;
}

/* Category pill */
.cat-pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 500;
}

/* Section headers */
.section-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.25rem;
    color: #f9fafb;
    margin: 28px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}

/* Status badge */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.2);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.75rem;
    color: #4ade80;
    font-weight: 500;
}

/* Override Streamlit table styling */
.stDataFrame { border-radius: 10px; overflow: hidden; }
</style>
""", unsafe_allow_html=True)


# ── Session state init ─────────────────────────────────────────────────────────
for key in ["df_parsed", "df_categorised", "stats"]:
    if key not in st.session_state:
        st.session_state[key] = None


# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 💳 FinLens")
    st.markdown("*AI-powered bank statement analysis*")
    st.divider()

    st.markdown("### Data source")
    source_choice = st.radio(
        "Choose how to load your statement:",
        ["Generate synthetic data", "Upload my CSV"],
        index=0,
        label_visibility="collapsed",
    )

    uploaded_file = None
    if source_choice == "Upload my CSV":
        uploaded_file = st.file_uploader(
            "Upload bank statement CSV",
            type=["csv"],
            help="Standard format: date, description, debit, credit, balance columns.",
        )
    else:
        st.info("We'll generate 3 months of realistic Indian bank transactions.")

    st.divider()
    st.markdown("### Model settings")
    ollama_model = st.text_input("Ollama model name", value="llama3.1")
    ollama_url = st.text_input("Ollama base URL", value="http://localhost:11434")

    # Inject into categorizer config
    import categorizer as cat_module
    cat_module.OLLAMA_MODEL = ollama_model
    cat_module.OLLAMA_BASE_URL = ollama_url

    st.divider()
    run_btn = st.button("▶  Analyse Statement", type="primary", use_container_width=True)

    if st.session_state.df_categorised is not None:
        if st.button("🔄  Reset", use_container_width=True):
            st.session_state.df_parsed = None
            st.session_state.df_categorised = None
            st.session_state.stats = None
            cat_module.clear_cache()
            st.rerun()


# ── Main area ──────────────────────────────────────────────────────────────────
st.markdown(
    '<h1 style="margin-bottom:4px">FinLens</h1>'
    '<p style="color:#6b7280;font-size:1rem;margin-top:0">Bank statement intelligence — powered by llama3 · Ollama</p>',
    unsafe_allow_html=True,
)

# ── STEP 1: Load + parse ───────────────────────────────────────────────────────
if run_btn:
    st.session_state.df_categorised = None   # Reset on new run

    with st.status("Loading statement…", expanded=True) as status:
        try:
            if source_choice == "Generate synthetic data":
                st.write("Generating 3 months of synthetic transactions…")
                buf = io.StringIO()
                import csv as csv_module
                rows = generate_statement(months=3, output_path="/tmp/synth.csv")
                st.write(f"✓ Generated {len(rows)} transactions")
                raw_df = parse_csv("/tmp/synth.csv")
            else:
                if uploaded_file is None:
                    st.error("Please upload a CSV file first.")
                    st.stop()
                st.write(f"Parsing {uploaded_file.name}…")
                raw_df = parse_csv(uploaded_file)

            st.session_state.df_parsed = raw_df
            st.session_state.stats = summary_stats(raw_df)
            st.write(f"✓ Parsed {len(raw_df)} transactions")

            # ── STEP 2: Categorise ─────────────────────────────────────────────
            st.write("Sending transactions to llama3 for categorisation…")
            st.write("*(This may take 30–90 seconds on first run — Ollama is working locally)*")

            progress_bar = st.progress(0)

            def update_progress(current, total):
                progress_bar.progress(current / total if total > 0 else 1.0)

            start = time.time()
            df_cat = batch_categorize(raw_df.copy(), progress_callback=update_progress)
            elapsed = round(time.time() - start, 1)
            progress_bar.progress(1.0)

            st.session_state.df_categorised = df_cat
            st.write(f"✓ Categorised {len(df_cat)} transactions in {elapsed}s")
            status.update(label="Analysis complete ✓", state="complete", expanded=False)

        except ConnectionError:
            st.error(
                "Could not connect to Ollama. "
                "Make sure Ollama is running (`ollama serve`) "
                f"and the model is pulled (`ollama pull {ollama_model}`)."
            )
            st.stop()
        except Exception as e:
            st.error(f"Error: {e}")
            st.stop()


# ── DISPLAY RESULTS ────────────────────────────────────────────────────────────
if st.session_state.df_categorised is not None:
    df = st.session_state.df_categorised
    stats = st.session_state.stats
    inc = income_summary(df)
    spend = spending_summary(df)

    # ── KPI row ────────────────────────────────────────────────────────────────
    st.markdown('<div class="section-title">Overview</div>', unsafe_allow_html=True)
    k1, k2, k3, k4, k5 = st.columns(5)

    with k1:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Total Transactions</div>
            <div class="kpi-value">{stats['total_transactions']}</div>
            <div class="kpi-sub">{stats['months_covered']} months · {stats['date_range'][0]} – {stats['date_range'][1]}</div>
        </div>""", unsafe_allow_html=True)

    with k2:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Total Income</div>
            <div class="kpi-value">₹{inc['total_income']:,.0f}</div>
            <div class="kpi-sub">Avg ₹{inc['avg_monthly_income']:,.0f}/mo</div>
        </div>""", unsafe_allow_html=True)

    with k3:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Total Spend</div>
            <div class="kpi-value">₹{spend['total_spend']:,.0f}</div>
            <div class="kpi-sub negative">Avg ₹{spend['avg_monthly_spend']:,.0f}/mo</div>
        </div>""", unsafe_allow_html=True)

    with k4:
        net = inc['total_income'] - spend['total_spend']
        net_class = "kpi-sub" if net >= 0 else "kpi-sub negative"
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Net Savings</div>
            <div class="kpi-value">₹{abs(net):,.0f}</div>
            <div class="{net_class}">{'Surplus ↑' if net >= 0 else 'Deficit ↓'}</div>
        </div>""", unsafe_allow_html=True)

    with k5:
        lt = spend['largest_transaction']
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Largest Spend</div>
            <div class="kpi-value">₹{lt['amount']:,.0f}</div>
            <div class="kpi-sub negative">{lt['description'][:22]} · {lt['date']}</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("---")

    # ── Category totals ────────────────────────────────────────────────────────
    col_left, col_right = st.columns([1, 1], gap="large")

    with col_left:
        st.markdown('<div class="section-title">Spend by Category</div>', unsafe_allow_html=True)
        cat_df = category_totals(df)

        display_cat = cat_df[["category", "total_spend", "transaction_count", "pct_of_total"]].copy()
        display_cat.columns = ["Category", "Total Spend (₹)", "# Transactions", "% of Total"]
        display_cat["Total Spend (₹)"] = display_cat["Total Spend (₹)"].apply(lambda x: f"₹{x:,.2f}")
        display_cat["% of Total"] = display_cat["% of Total"].apply(lambda x: f"{x:.1f}%")

        st.dataframe(display_cat, use_container_width=True, hide_index=True)

    with col_right:
        st.markdown('<div class="section-title">Top 10 Merchants</div>', unsafe_allow_html=True)
        merch_df = top_merchants(df, n=10)

        display_merch = merch_df[["description", "category", "total_spend", "transaction_count"]].copy()
        display_merch.columns = ["Merchant", "Category", "Total Spend (₹)", "# Txns"]
        display_merch["Total Spend (₹)"] = display_merch["Total Spend (₹)"].apply(lambda x: f"₹{x:,.2f}")

        st.dataframe(display_merch, use_container_width=True, hide_index=True)

    # ── Monthly summary ────────────────────────────────────────────────────────
    st.markdown('<div class="section-title">Monthly Summary</div>', unsafe_allow_html=True)

    monthly_df = monthly_summary(df)
    display_monthly = monthly_df.copy()
    for col in ["income", "spend", "net"]:
        display_monthly[col] = display_monthly[col].apply(lambda x: f"₹{x:,.2f}")
    display_monthly.columns = ["Month", "Income (₹)", "Spend (₹)", "Net (₹)"]

    st.dataframe(display_monthly, use_container_width=True, hide_index=True)

    # ── Full transaction table ─────────────────────────────────────────────────
    st.markdown('<div class="section-title">All Transactions</div>', unsafe_allow_html=True)

    # Filter controls
    filter_col1, filter_col2, filter_col3 = st.columns([1, 1, 2])
    with filter_col1:
        all_cats = ["All"] + sorted(df["category"].dropna().unique().tolist())
        selected_cat = st.selectbox("Filter by category", all_cats)
    with filter_col2:
        all_months = ["All"] + sorted(df["month"].astype(str).unique().tolist())
        selected_month = st.selectbox("Filter by month", all_months)
    with filter_col3:
        search_term = st.text_input("Search description", placeholder="e.g. Swiggy, salary…")

    filtered = df.copy()
    if selected_cat != "All":
        filtered = filtered[filtered["category"] == selected_cat]
    if selected_month != "All":
        filtered = filtered[filtered["month"].astype(str) == selected_month]
    if search_term:
        filtered = filtered[filtered["description"].str.contains(search_term, case=False, na=False)]

    display_txns = filtered[["date", "description", "category", "debit", "credit", "balance", "mode"]].copy()
    display_txns["date"] = display_txns["date"].dt.strftime("%d %b %Y")
    for col in ["debit", "credit", "balance"]:
        display_txns[col] = display_txns[col].apply(
            lambda x: f"₹{x:,.2f}" if pd.notna(x) and x != "" else ""
        )
    display_txns.columns = ["Date", "Description", "Category", "Debit", "Credit", "Balance", "Mode"]

    st.dataframe(display_txns, use_container_width=True, hide_index=True, height=420)
    st.caption(f"Showing {len(filtered)} of {len(df)} transactions")

    # ── Download ───────────────────────────────────────────────────────────────
    st.markdown("---")
    csv_out = df.copy()
    csv_out["date"] = csv_out["date"].dt.strftime("%d/%m/%Y")
    csv_out["month"] = csv_out["month"].astype(str)
    csv_bytes = csv_out.to_csv(index=False).encode("utf-8")

    st.download_button(
        "⬇  Download categorised statement (CSV)",
        data=csv_bytes,
        file_name="categorised_statement.csv",
        mime="text/csv",
    )

else:
    # ── Empty state ────────────────────────────────────────────────────────────
    st.markdown("---")
    st.markdown("""
    ### How it works
    1. **Load data** — generate synthetic transactions or upload your own CSV
    2. **LLM categorisation** — llama3 running locally (via Ollama) assigns a spending category to each transaction
    3. **Aggregation** — pandas computes totals, monthly trends, and top merchants
    4. **Explore** — filter by category, month, or search by merchant name

    > **Week 8 preview:** Plotly charts (donut + bar), z-score anomaly detection, and a natural-language spending summary.
    """)
    st.info(
        "Click **▶ Analyse Statement** in the sidebar to get started. "
        "Make sure Ollama is running with llama3.1 pulled."
    )