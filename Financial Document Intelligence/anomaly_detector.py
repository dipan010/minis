"""
anomaly_detector.py
Z-score based anomaly detection for personal-finance transactions.

Methodology
-----------
A z-score measures how many standard deviations a value sits from its
group mean:  z = (x − μ) / σ.  Values beyond a chosen threshold are
flagged as anomalies.

Two detectors are provided:

1. **category_month_anomalies** — compares each month's total spend in a
   category against the historical mean for that category.  Default
   threshold: 2.0 (≈ top/bottom 2.3 % under a normal distribution).

2. **transaction_outliers** — compares each individual debit transaction
   against the mean debit within its own category.  Default threshold:
   2.5 (stricter, since individual transactions are noisier).

Both thresholds are configurable via function parameters.
"""

import pandas as pd
from aggregator import monthly_by_category


def category_month_anomalies(
    df: pd.DataFrame,
    z_threshold: float = 2.0,
) -> pd.DataFrame:
    """
    Flag months where a category's total spend is unusually high or low
    relative to that category's historical average.

    Parameters
    ----------
    df : DataFrame  — categorised transaction DataFrame (needs amount,
         debit, month, category columns).
    z_threshold : float — minimum abs(z-score) to flag.

    Returns
    -------
    DataFrame with columns: month, category, spend, z_score, direction
    sorted by abs(z_score) descending.  Empty if nothing exceeds threshold.
    """
    pivot = monthly_by_category(df)
    category_cols = [c for c in pivot.columns if c != "month"]

    records = []
    for cat in category_cols:
        values = pivot[cat]
        if len(values) < 3:
            continue
        mean = values.mean()
        std = values.std(ddof=0)
        if std == 0:
            continue
        for _, row in pivot.iterrows():
            z = (row[cat] - mean) / std
            if abs(z) > z_threshold:
                direction = "unusually high" if z > 0 else "unusually low"
                records.append({
                    "month": row["month"],
                    "category": cat,
                    "spend": round(row[cat], 2),
                    "z_score": round(z, 2),
                    "direction": direction,
                })

    result = pd.DataFrame(records, columns=["month", "category", "spend", "z_score", "direction"])
    if not result.empty:
        result = result.sort_values("z_score", key=abs, ascending=False).reset_index(drop=True)
    return result


def transaction_outliers(
    df: pd.DataFrame,
    z_threshold: float = 2.5,
) -> pd.DataFrame:
    """
    Flag individual debit transactions whose amount is an outlier within
    their category.

    Parameters
    ----------
    df : DataFrame  — categorised transaction DataFrame.
    z_threshold : float — minimum z-score to flag.

    Returns
    -------
    DataFrame with columns: date, description, category, debit, z_score
    sorted by z_score descending, limited to top 15 rows.
    """
    spends = df[df["amount"] < 0].copy()
    records = []

    for cat, group in spends.groupby("category"):
        if len(group) < 5:
            continue
        mean = group["debit"].mean()
        std = group["debit"].std(ddof=0)
        if std == 0:
            continue
        for _, row in group.iterrows():
            z = (row["debit"] - mean) / std
            if z > z_threshold:
                records.append({
                    "date": row["date"],
                    "description": row["description"],
                    "category": cat,
                    "debit": round(row["debit"], 2),
                    "z_score": round(z, 2),
                })

    result = pd.DataFrame(records, columns=["date", "description", "category", "debit", "z_score"])
    if not result.empty:
        result = result.sort_values("z_score", ascending=False).head(15).reset_index(drop=True)
    return result
