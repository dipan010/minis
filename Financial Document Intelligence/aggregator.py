"""
aggregator.py
Pandas aggregation pipeline that turns a categorised DataFrame into
summary tables consumed by the Streamlit UI.

Functions:
  category_totals(df)       → spending by category (debits only)
  monthly_summary(df)       → income vs. spend per month
  monthly_by_category(df)   → spend per category per month (pivot)
  top_merchants(df, n)      → top N merchants by total spend
  net_cashflow(df)          → running net balance trend
  income_summary(df)        → total income, avg monthly income
"""

import pandas as pd


def category_totals(df: pd.DataFrame) -> pd.DataFrame:
    """
    Total debits grouped by category.
    Returns DataFrame: [category, total_spend, transaction_count, pct_of_total]
    Sorted by total_spend descending, excludes Income rows.
    """
    spend = df[df["debit"].notna() & (df["amount"] < 0)].copy()
    spend["spend"] = spend["debit"].fillna(0)

    agg = (
        spend.groupby("category")
        .agg(
            total_spend=("spend", "sum"),
            transaction_count=("spend", "count"),
        )
        .reset_index()
        .sort_values("total_spend", ascending=False)
    )

    total = agg["total_spend"].sum()
    agg["pct_of_total"] = (
        (agg["total_spend"] / total * 100).round(1) if total > 0 else 0.0
    )
    agg["total_spend"] = agg["total_spend"].round(2)

    return agg.reset_index(drop=True)


def monthly_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Per-month income, total spend, and net cashflow.
    Returns DataFrame: [month, income, spend, net]
    """
    df = df.copy()
    df["month_str"] = df["month"].astype(str)

    income = (
        df[df["amount"] > 0]
        .groupby("month_str")["credit"]
        .sum()
        .rename("income")
    )
    spend = (
        df[df["amount"] < 0]
        .groupby("month_str")["debit"]
        .sum()
        .rename("spend")
    )

    summary = pd.concat([income, spend], axis=1).fillna(0).reset_index()
    summary.rename(columns={"month_str": "month"}, inplace=True)
    summary["net"] = (summary["income"] - summary["spend"]).round(2)
    summary["income"] = summary["income"].round(2)
    summary["spend"] = summary["spend"].round(2)
    summary.sort_values("month", inplace=True)

    return summary.reset_index(drop=True)


def monthly_by_category(df: pd.DataFrame) -> pd.DataFrame:
    """
    Spend per category per month — pivot table.
    Rows = months, Columns = categories.
    Values are debit totals (positive numbers for display).
    Income rows are excluded.
    """
    spend = df[df["amount"] < 0].copy()
    spend["month_str"] = spend["month"].astype(str)
    spend["spend"] = spend["debit"].fillna(0)

    pivot = (
        spend.pivot_table(
            index="month_str",
            columns="category",
            values="spend",
            aggfunc="sum",
            fill_value=0,
        )
        .round(2)
        .reset_index()
        .rename(columns={"month_str": "month"})
    )
    pivot.sort_values("month", inplace=True)
    return pivot.reset_index(drop=True)


def top_merchants(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """
    Top N merchants by total spend (debits only).
    Returns DataFrame: [description, category, total_spend, transaction_count]
    """
    spend = df[df["amount"] < 0].copy()
    spend["spend"] = spend["debit"].fillna(0)

    agg = (
        spend.groupby(["description", "category"])
        .agg(
            total_spend=("spend", "sum"),
            transaction_count=("spend", "count"),
        )
        .reset_index()
        .sort_values("total_spend", ascending=False)
        .head(n)
    )
    agg["total_spend"] = agg["total_spend"].round(2)
    return agg.reset_index(drop=True)


def net_cashflow(df: pd.DataFrame) -> pd.DataFrame:
    """
    Running net cashflow: cumulative sum of signed amounts over time.
    Returns DataFrame: [date, amount, running_total]
    Useful for a line chart of account trajectory.
    """
    daily = (
        df.groupby("date")["amount"]
        .sum()
        .reset_index()
        .sort_values("date")
    )
    daily["running_total"] = daily["amount"].cumsum().round(2)
    daily["amount"] = daily["amount"].round(2)
    return daily


def income_summary(df: pd.DataFrame) -> dict:
    """
    High-level income stats.
    Returns dict: {total_income, avg_monthly_income, income_sources}
    """
    income_rows = df[df["amount"] > 0]
    total = round(income_rows["credit"].sum(), 2)
    months = df["month"].nunique()
    avg_monthly = round(total / months, 2) if months > 0 else 0.0
    sources = income_rows["description"].value_counts().to_dict()

    return {
        "total_income": total,
        "avg_monthly_income": avg_monthly,
        "income_sources": sources,
    }


def spending_summary(df: pd.DataFrame) -> dict:
    """
    High-level spending stats.
    Returns dict for KPI cards in the UI.
    """
    spend_rows = df[df["amount"] < 0]
    total_spend = round(spend_rows["debit"].sum(), 2)
    months = df["month"].nunique()
    avg_monthly = round(total_spend / months, 2) if months > 0 else 0.0
    largest_txn = spend_rows.loc[spend_rows["debit"].idxmax()] if len(spend_rows) > 0 else None

    return {
        "total_spend": total_spend,
        "avg_monthly_spend": avg_monthly,
        "largest_transaction": {
            "description": largest_txn["description"] if largest_txn is not None else "N/A",
            "amount": round(largest_txn["debit"], 2) if largest_txn is not None else 0,
            "date": largest_txn["date"].strftime("%d %b %Y") if largest_txn is not None else "N/A",
        },
        "num_transactions": len(spend_rows),
    }