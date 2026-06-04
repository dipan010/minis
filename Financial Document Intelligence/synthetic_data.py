"""
synthetic_data.py
Generates a realistic 3-month Indian bank statement as a CSV file.
Run standalone to produce sample_statement.csv:
    python synthetic_data.py
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

# ── Merchant pool by category ─────────────────────────────────────────────────
MERCHANTS = {
    "Groceries": [
        ("BigBasket", -1, "UPI"),
        ("DMart", -1, "Debit Card"),
        ("Reliance Smart", -1, "Debit Card"),
        ("Zepto", -1, "UPI"),
        ("Blinkit", -1, "UPI"),
    ],
    "Food & Dining": [
        ("Swiggy", -1, "UPI"),
        ("Zomato", -1, "UPI"),
        ("Cafe Coffee Day", -1, "Debit Card"),
        ("Haldiram's", -1, "Cash"),
        ("McDonald's", -1, "Debit Card"),
    ],
    "Transport": [
        ("Ola Cabs", -1, "UPI"),
        ("Uber India", -1, "UPI"),
        ("BMTC Bus Pass", -1, "UPI"),
        ("Namma Metro", -1, "UPI"),
        ("Rapido", -1, "UPI"),
    ],
    "Utilities": [
        ("BESCOM Electricity", -1, "NEFT"),
        ("Airtel Postpaid", -1, "Auto Debit"),
        ("Jio Fiber", -1, "Auto Debit"),
        ("BWSSB Water", -1, "NEFT"),
        ("LPG Booking HPCL", -1, "UPI"),
    ],
    "Shopping": [
        ("Amazon India", -1, "Debit Card"),
        ("Flipkart", -1, "UPI"),
        ("Myntra", -1, "Debit Card"),
        ("Meesho", -1, "UPI"),
        ("Nykaa", -1, "Debit Card"),
    ],
    "Healthcare": [
        ("Apollo Pharmacy", -1, "UPI"),
        ("Practo Consult", -1, "UPI"),
        ("MedPlus", -1, "Debit Card"),
        ("Manipal Hospital", -1, "NEFT"),
        ("1mg", -1, "UPI"),
    ],
    "Entertainment": [
        ("Netflix India", -1, "Auto Debit"),
        ("Hotstar Premium", -1, "Auto Debit"),
        ("BookMyShow", -1, "UPI"),
        ("Spotify India", -1, "Auto Debit"),
        ("Amazon Prime", -1, "Auto Debit"),
    ],
    "Education": [
        ("Udemy", -1, "Debit Card"),
        ("Coursera", -1, "Debit Card"),
        ("BYJU'S", -1, "Auto Debit"),
        ("Unacademy", -1, "UPI"),
        ("GeeksforGeeks Premium", -1, "UPI"),
    ],
    "Rent & Housing": [
        ("Rent Transfer", -1, "NEFT"),
        ("Society Maintenance", -1, "NEFT"),
        ("NoBroker Rent Pay", -1, "UPI"),
    ],
    "Income": [
        ("Salary Credit", 1, "NEFT"),
        ("Freelance Payment", 1, "IMPS"),
        ("Cashback Credit", 1, "Credit"),
        ("Interest Credit", 1, "Credit"),
    ],
    "ATM / Cash": [
        ("ATM Withdrawal", -1, "ATM"),
    ],
    "Insurance": [
        ("LIC Premium", -1, "Auto Debit"),
        ("HDFC Life", -1, "Auto Debit"),
        ("Star Health Insurance", -1, "NEFT"),
    ],
    "Investments": [
        ("Zerodha MF SIP", -1, "Auto Debit"),
        ("Groww SIP", -1, "Auto Debit"),
        ("PPF Contribution", -1, "NEFT"),
        ("NPS Contribution", -1, "Auto Debit"),
    ],
}

# Typical amount ranges per category (INR)
AMOUNT_RANGES = {
    "Groceries":      (200, 3500),
    "Food & Dining":  (80, 1200),
    "Transport":      (50, 800),
    "Utilities":      (300, 4500),
    "Shopping":       (300, 8000),
    "Healthcare":     (100, 5000),
    "Entertainment":  (149, 999),
    "Education":      (500, 6000),
    "Rent & Housing": (8000, 25000),
    "Income":         (50000, 85000),
    "ATM / Cash":     (2000, 10000),
    "Insurance":      (2000, 15000),
    "Investments":    (1000, 10000),
}

# How many transactions per category per month (min, max)
FREQUENCY = {
    "Groceries":      (4, 8),
    "Food & Dining":  (8, 20),
    "Transport":      (10, 25),
    "Utilities":      (3, 5),
    "Shopping":       (2, 6),
    "Healthcare":     (0, 3),
    "Entertainment":  (2, 4),
    "Education":      (0, 2),
    "Rent & Housing": (1, 2),
    "Income":         (1, 2),
    "ATM / Cash":     (1, 4),
    "Insurance":      (0, 1),
    "Investments":    (2, 4),
}


def random_date_in_month(year: int, month: int) -> date:
    """Return a random date within the given month."""
    if month == 12:
        end_day = 31
    else:
        # Simple calculation for days in month
        next_month = date(year, month + 1, 1)
        end_day = (next_month - timedelta(days=1)).day
    return date(year, month, random.randint(1, end_day))


def generate_statement(
    months: int = 3,
    start_year: int = 2025,
    start_month: int = 10,
    output_path: str = "sample_statement.csv",
    account_holder: str = "Rohan Mehta",
    account_number: str = "XXXX-XXXX-4521",
) -> list[dict]:
    """
    Generate synthetic bank statement rows.
    Returns list of dicts and writes to CSV.
    """
    rows = []
    balance = 120000.0  # Starting balance (INR)

    for m in range(months):
        month = (start_month + m - 1) % 12 + 1
        year = start_year + (start_month + m - 1) // 12

        for category, merchants in MERCHANTS.items():
            lo, hi = FREQUENCY[category]
            count = random.randint(lo, hi)
            amt_lo, amt_hi = AMOUNT_RANGES[category]

            for _ in range(count):
                merchant_name, direction, mode = random.choice(merchants)
                amount = round(random.uniform(amt_lo, amt_hi), 2)
                signed_amount = direction * amount

                # Add minor noise to salary amounts
                if category == "Income" and "Salary" in merchant_name:
                    signed_amount = round(random.uniform(65000, 85000), 2)

                balance = round(balance + signed_amount, 2)
                txn_date = random_date_in_month(year, month)

                rows.append({
                    "date": txn_date.strftime("%d/%m/%Y"),
                    "description": merchant_name,
                    "debit": round(amount, 2) if direction == -1 else "",
                    "credit": round(amount, 2) if direction == 1 else "",
                    "balance": max(balance, 0),  # floor at 0 for realism
                    "mode": mode,
                })

    # Sort by date
    rows.sort(key=lambda r: (
        int(r["date"].split("/")[2]),
        int(r["date"].split("/")[1]),
        int(r["date"].split("/")[0]),
    ))

    # Write CSV
    output = Path(output_path)
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["date", "description", "debit", "credit", "balance", "mode"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Generated {len(rows)} transactions → {output}")
    return rows


if __name__ == "__main__":
    generate_statement(output_path="sample_statement.csv")