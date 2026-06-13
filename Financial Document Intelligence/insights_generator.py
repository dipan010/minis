"""
insights_generator.py
LLM-powered natural-language spending summary.

Uses Ollama (same local instance as categorizer.py) to turn aggregated
numbers into a short, friendly prose paragraph a user can skim at the
top of their dashboard.

The Ollama connection settings (OLLAMA_BASE_URL, OLLAMA_MODEL) are read
from categorizer at call time, so any overrides the Streamlit UI injects
into that module are automatically picked up here.

On any Ollama failure the function returns a deterministic fallback
string built from the same numbers — no LLM required.
"""

import requests
import categorizer


def _call_ollama(prompt: str) -> str:
    """POST to the Ollama generate endpoint and return the text response."""
    resp = requests.post(
        f"{categorizer.OLLAMA_BASE_URL}/api/generate",
        json={
            "model": categorizer.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.4,
                "num_predict": 250,
            },
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["response"]


def generate_spending_summary(
    category_totals_df,
    monthly_summary_df,
    anomalies_df,
    income_summary_dict,
    spending_summary_dict,
) -> str:
    """
    Produce a 3-5 sentence plain-English spending summary.

    Parameters
    ----------
    category_totals_df   : from aggregator.category_totals(df)
    monthly_summary_df   : from aggregator.monthly_summary(df)
    anomalies_df         : from anomaly_detector.category_month_anomalies(df)
    income_summary_dict  : from aggregator.income_summary(df)
    spending_summary_dict: from aggregator.spending_summary(df)

    Returns
    -------
    str — the summary paragraph (plain text, no markdown).
    """
    # ── Build compact data snapshot for the prompt ────────────────────────
    total_income = income_summary_dict["total_income"]
    total_spend = spending_summary_dict["total_spend"]
    net = total_income - total_spend

    # Top categories
    top_cats = category_totals_df.head(4)
    cat_lines = []
    for _, r in top_cats.iterrows():
        cat_lines.append(
            f"  {r['category']}: ₹{r['total_spend']:,.2f} ({r['pct_of_total']:.1f}%)"
        )
    cat_block = "\n".join(cat_lines)

    # Monthly trend
    month_lines = []
    for _, r in monthly_summary_df.iterrows():
        month_lines.append(
            f"  {r['month']}: income ₹{r['income']:,.0f}, "
            f"spend ₹{r['spend']:,.0f}, net ₹{r['net']:,.0f}"
        )
    month_block = "\n".join(month_lines)

    # Anomalies (up to 3)
    anom_block = "None detected."
    if anomalies_df is not None and not anomalies_df.empty:
        anom_lines = []
        for _, r in anomalies_df.head(3).iterrows():
            anom_lines.append(
                f"  {r['month']} {r['category']}: {r['direction']} "
                f"(₹{r['spend']:,.2f}, z={r['z_score']:.2f})"
            )
        anom_block = "\n".join(anom_lines)

    data_snapshot = (
        f"Total income: ₹{total_income:,.2f}\n"
        f"Total spend: ₹{total_spend:,.2f}\n"
        f"Net savings: ₹{net:,.2f}\n\n"
        f"Top spending categories:\n{cat_block}\n\n"
        f"Monthly trend:\n{month_block}\n\n"
        f"Anomalies:\n{anom_block}"
    )

    prompt = (
        "You are a friendly personal finance assistant. "
        "Based on the data below, write a 3-5 sentence summary of the "
        "user's spending in plain English. Use a warm, non-judgmental tone. "
        "Rules: no markdown, no bullet points, just flowing prose. "
        "Mention concrete rupee figures from the data provided. "
        "Do not invent any numbers that are not given below. "
        "If anomalies are present, mention the most significant one "
        "naturally in the text.\n\n"
        f"DATA:\n{data_snapshot}\n\n"
        "SUMMARY:"
    )

    # ── Fallback (deterministic, no LLM) ─────────────────────────────────
    top_cat = top_cats.iloc[0]
    fallback = (
        f"Over the period analysed, you earned ₹{total_income:,.2f} and "
        f"spent ₹{total_spend:,.2f}, for a net of ₹{net:,.2f}. "
        f"Your largest spending category was {top_cat['category']} at "
        f"₹{top_cat['total_spend']:,.2f} ({top_cat['pct_of_total']:.1f}%)."
    )

    try:
        summary = _call_ollama(prompt).strip()
        if not summary:
            return fallback
        return summary
    except Exception:
        return fallback
