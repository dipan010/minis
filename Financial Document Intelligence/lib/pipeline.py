"""
pipeline.py — Full analysis pipeline orchestrator for FinLens.

Runs the complete pipeline: parse CSV → categorize → aggregate → detect anomalies → generate insights.
Used by both the API server and the A2A handler.
"""

from __future__ import annotations

import io
import logging
from typing import Any, Union

import pandas as pd

import categorizer
from transaction_parser import parse_csv, summary_stats
from aggregator import (
    category_totals,
    monthly_summary,
    top_merchants,
    income_summary,
    spending_summary,
)
from anomaly_detector import category_month_anomalies, transaction_outliers
from insights_generator import generate_spending_summary

logger = logging.getLogger(__name__)


def run_full_analysis(
    csv_source: Union[str, io.BytesIO, io.StringIO],
    ollama_model: str = "llama3.1:8b",
    ollama_url: str = "http://localhost:11434",
) -> dict[str, Any]:
    """
    Run the complete FinLens pipeline on a CSV bank statement.

    Parameters
    ----------
    csv_source : file path, BytesIO, or StringIO of the CSV.
    ollama_model : Ollama model name for categorization and insights.
    ollama_url : Ollama base URL.

    Returns
    -------
    dict with keys: stats, category_totals, monthly_summary, top_merchants,
    income_summary, spending_summary, anomalies, transaction_outliers,
    spending_summary_text.
    """
    # Configure categorizer
    categorizer.OLLAMA_MODEL = ollama_model
    categorizer.OLLAMA_BASE_URL = ollama_url

    # Step 1: Parse CSV
    df = parse_csv(csv_source)
    stats = summary_stats(df)

    # Step 2: Categorize transactions
    df_cat = categorizer.batch_categorize(df.copy())

    # Step 3: Aggregate
    cat_totals_df = category_totals(df_cat)
    monthly_df = monthly_summary(df_cat)
    merchants_df = top_merchants(df_cat)
    income_dict = income_summary(df_cat)
    spending_dict = spending_summary(df_cat)

    # Step 4: Detect anomalies
    anomalies_df = category_month_anomalies(df_cat)
    outliers_df = transaction_outliers(df_cat)

    # Step 5: Generate insights
    spending_text = generate_spending_summary(
        category_totals_df=cat_totals_df,
        monthly_summary_df=monthly_df,
        anomalies_df=anomalies_df,
        income_summary_dict=income_dict,
        spending_summary_dict=spending_dict,
    )

    # Ensure JSON-serializable types (pandas Period / datetime64 are not)
    if "month" in monthly_df.columns:
        monthly_df["month"] = monthly_df["month"].astype(str)
    if "month" in anomalies_df.columns:
        anomalies_df["month"] = anomalies_df["month"].astype(str)
    for col in outliers_df.select_dtypes(include=["datetime64", "datetimetz"]).columns:
        outliers_df[col] = outliers_df[col].dt.isoformat()
    for col in df_cat.select_dtypes(include=["datetime64", "datetimetz"]).columns:
        merchants_df[col] = merchants_df[col].astype(str) if col in merchants_df.columns else None

    # Convert DataFrames to serializable dicts
    def df_to_records(frame: pd.DataFrame) -> list[dict]:
        return frame.to_dict(orient="records") if not frame.empty else []

    return {
        "stats": stats,
        "category_totals": df_to_records(cat_totals_df),
        "monthly_summary": df_to_records(monthly_df),
        "top_merchants": df_to_records(merchants_df),
        "income_summary": income_dict,
        "spending_summary": spending_dict,
        "anomalies": df_to_records(anomalies_df),
        "transaction_outliers": df_to_records(outliers_df),
        "spending_summary_text": spending_text,
    }
