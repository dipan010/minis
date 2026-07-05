"""
categorizer.py
LLM-powered transaction categorisation using Ollama.

Sends transaction descriptions to the LLM in batches and assigns a
spending category to each row. Results are cached in a module-level
dict to avoid re-categorising the same descriptions.

Categories:
  Groceries, Food & Dining, Transport, Shopping, Utilities,
  Entertainment, Health, Education, Rent, Salary, Transfer, Other
"""

import logging
from typing import Callable, Optional

import pandas as pd
import requests

logger = logging.getLogger(__name__)

# ── Module-level config (overridden by Streamlit UI or API) ──────────────────
OLLAMA_MODEL = "llama3.1:8b"
OLLAMA_BASE_URL = "http://localhost:11434"

# ── Category list ────────────────────────────────────────────────────────────
CATEGORIES = [
    "Groceries", "Food & Dining", "Transport", "Shopping", "Utilities",
    "Entertainment", "Health", "Education", "Rent", "Salary", "Transfer", "Other",
]

# ── Cache ────────────────────────────────────────────────────────────────────
_category_cache: dict[str, str] = {}

BATCH_SIZE = 15

SYSTEM_PROMPT = f"""You are a personal finance assistant. Categorise each bank transaction description into EXACTLY one of these categories:
{', '.join(CATEGORIES)}

Rules:
- Return ONLY a JSON array of category strings, one per input description.
- The array length MUST equal the number of input descriptions.
- Use ONLY categories from the list above.
- If unsure, use "Other".
- No explanations, no markdown, just the JSON array."""


def clear_cache() -> None:
    """Reset the category cache."""
    _category_cache.clear()


def _categorise_batch(descriptions: list[str]) -> list[str]:
    """Send a batch of descriptions to Ollama and return category assignments."""
    import json

    numbered = "\n".join(f"{i+1}. {d}" for i, d in enumerate(descriptions))
    prompt = f"Categorise these {len(descriptions)} transactions:\n{numbered}"

    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "system": SYSTEM_PROMPT,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1},
            },
            timeout=90,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")

        # Parse response — expect a JSON array
        import re
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        parsed = json.loads(raw)

        # Handle both {"categories": [...]} and plain [...]
        if isinstance(parsed, dict):
            parsed = parsed.get("categories", list(parsed.values())[0] if parsed else [])

        if isinstance(parsed, list) and len(parsed) == len(descriptions):
            # Validate categories
            return [c if c in CATEGORIES else "Other" for c in parsed]

    except Exception as e:
        logger.warning("Ollama categorisation failed for batch: %s", e)

    # Fallback: assign "Other" to all
    return ["Other"] * len(descriptions)


def batch_categorize(
    df: pd.DataFrame,
    progress_callback: Optional[Callable[[float], None]] = None,
) -> pd.DataFrame:
    """
    Categorise all transactions in the DataFrame.

    Adds a 'category' column to the DataFrame. Uses caching to avoid
    re-categorising descriptions already seen.

    Parameters
    ----------
    df : DataFrame with a 'description' column.
    progress_callback : optional callable(float) for progress updates (0.0–1.0).

    Returns
    -------
    DataFrame with 'category' column added.
    """
    descriptions = df["description"].tolist()
    categories: list[str] = []

    # Separate cached vs uncached
    uncached_indices: list[int] = []
    uncached_descs: list[str] = []

    for i, desc in enumerate(descriptions):
        if desc in _category_cache:
            categories.append(_category_cache[desc])
        else:
            categories.append("")  # placeholder
            uncached_indices.append(i)
            uncached_descs.append(desc)

    # Process uncached in batches
    total_batches = (len(uncached_descs) + BATCH_SIZE - 1) // BATCH_SIZE if uncached_descs else 1
    processed = 0

    for batch_start in range(0, len(uncached_descs), BATCH_SIZE):
        batch = uncached_descs[batch_start:batch_start + BATCH_SIZE]
        batch_cats = _categorise_batch(batch)

        for j, cat in enumerate(batch_cats):
            idx = uncached_indices[batch_start + j]
            categories[idx] = cat
            _category_cache[uncached_descs[batch_start + j]] = cat

        processed += 1
        if progress_callback:
            progress_callback(processed / total_batches)

    df = df.copy()
    df["category"] = categories
    return df
