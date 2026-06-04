"""
transaction_parser.py
Reads a CSV bank statement (or uses synthetic data) and normalises it
into a clean pandas DataFrame ready for categorisation and aggregation.

Supported CSV formats:
  - Standard (date, description, debit, credit, balance, mode)
  - HDFC-style (Date, Narration, Value Date, Withdrawal Amt., Deposit Amt., Balance)
  - ICICI-style (Transaction Date, Transaction Remarks, Amount(INR), Type, Balance(INR))
  - Generic fallback — tries to infer columns by name patterns
"""

import io
from pathlib import Path
from typing import Union

import pandas as pd


# ── Column name normalisation maps ────────────────────────────────────────────
# Maps common bank-specific column names → our standard internal names.
COLUMN_ALIASES = {
    "date": ["date", "transaction date", "txn date", "value date", "posting date"],
    "description": [
        "description", "narration", "transaction remarks", "particulars",
        "details", "remarks", "transaction details",
    ],
    "debit": [
        "debit", "withdrawal", "withdrawal amt.", "withdrawal amount",
        "dr amount", "debit amount",
    ],
    "credit": [
        "credit", "deposit", "deposit amt.", "deposit amount",
        "cr amount", "credit amount",
    ],
    "balance": ["balance", "balance(inr)", "closing balance", "available balance"],
    "mode": ["mode", "type", "payment mode", "transaction type"],
}


def _match_columns(df: pd.DataFrame) -> dict[str, str]:
    """
    Return a mapping of {standard_name: actual_column_name} for the given df.
    Raises ValueError if date or description columns cannot be found.
    """
    lower_cols = {c.strip().lower(): c for c in df.columns}
    mapping: dict[str, str] = {}

    for standard, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_cols:
                mapping[standard] = lower_cols[alias]
                break

    missing = [k for k in ("date", "description") if k not in mapping]
    if missing:
        raise ValueError(
            f"Could not find required columns: {missing}. "
            f"Columns in file: {list(df.columns)}"
        )
    return mapping


def _parse_amount(series: pd.Series) -> pd.Series:
    """
    Clean a monetary column: remove commas, currency symbols, spaces.
    Returns float64 Series with NaN for blanks.
    """
    return (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("₹", "", regex=False)
        .str.replace("INR", "", regex=False)
        .str.strip()
        .replace({"": None, "nan": None, "None": None, "-": None})
        .astype(float)
    )


def _parse_date(series: pd.Series) -> pd.Series:
    """
    Try multiple date formats; return datetime64 Series.
    """
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %b %Y", "%d-%b-%Y"):
        try:
            return pd.to_datetime(series, format=fmt, dayfirst=True)
        except (ValueError, TypeError):
            continue
    # Last resort: let pandas infer
    return pd.to_datetime(series, dayfirst=True, infer_datetime_format=True)


def parse_csv(source: Union[str, Path, io.BytesIO, io.StringIO]) -> pd.DataFrame:
    """
    Parse a bank statement CSV into a normalised DataFrame.

    Returns columns:
        date         — datetime64
        description  — str
        debit        — float (NaN if not a debit)
        credit       — float (NaN if not a credit)
        balance      — float (NaN if not present)
        mode         — str  (NaN if not present)
        amount       — float (positive = credit, negative = debit)
        month        — period[M]  e.g. 2025-10
    """
    # ── Read raw CSV ──────────────────────────────────────────────────────────
    if isinstance(source, (str, Path)):
        raw = pd.read_csv(source, dtype=str, skip_blank_lines=True)
    else:
        raw = pd.read_csv(source, dtype=str, skip_blank_lines=True)

    # Strip whitespace from column names
    raw.columns = [c.strip() for c in raw.columns]

    # Drop fully-empty rows
    raw.dropna(how="all", inplace=True)

    # ── Map columns ───────────────────────────────────────────────────────────
    col_map = _match_columns(raw)

    df = pd.DataFrame()
    df["date"] = _parse_date(raw[col_map["date"]])
    df["description"] = raw[col_map["description"]].astype(str).str.strip()

    # Debit / credit amounts
    if "debit" in col_map:
        df["debit"] = _parse_amount(raw[col_map["debit"]])
    else:
        df["debit"] = float("nan")

    if "credit" in col_map:
        df["credit"] = _parse_amount(raw[col_map["credit"]])
    else:
        df["credit"] = float("nan")

    # Balance (optional)
    if "balance" in col_map:
        df["balance"] = _parse_amount(raw[col_map["balance"]])
    else:
        df["balance"] = float("nan")

    # Mode (optional)
    if "mode" in col_map:
        df["mode"] = raw[col_map["mode"]].astype(str).str.strip()
    else:
        df["mode"] = "Unknown"

    # ── Derived columns ───────────────────────────────────────────────────────
    # Unified signed amount: positive = money in, negative = money out
    df["amount"] = df["credit"].fillna(0) - df["debit"].fillna(0)

    # Month period for aggregation
    df["month"] = df["date"].dt.to_period("M")

    # Sort chronologically
    df.sort_values("date", inplace=True)
    df.reset_index(drop=True, inplace=True)

    # ── Basic validation ──────────────────────────────────────────────────────
    n_rows = len(df)
    n_no_amount = (df["amount"] == 0).sum()
    if n_no_amount > n_rows * 0.5:
        # More than half rows have zero amount — likely a parsing issue
        raise ValueError(
            f"Warning: {n_no_amount}/{n_rows} rows have zero amount. "
            "Check that debit/credit columns were detected correctly."
        )

    return df


def summary_stats(df: pd.DataFrame) -> dict:
    """
    Return a quick summary dict about the parsed statement.
    Useful for displaying metadata in the UI before categorisation.
    """
    return {
        "total_transactions": len(df),
        "date_range": (
            df["date"].min().strftime("%d %b %Y"),
            df["date"].max().strftime("%d %b %Y"),
        ),
        "total_credits": round(df["credit"].sum(min_count=1), 2),
        "total_debits": round(df["debit"].sum(min_count=1), 2),
        "months_covered": df["month"].nunique(),
        "unique_merchants": df["description"].nunique(),
    }