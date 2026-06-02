"""
core/scraper.py — URL content extraction.

WHY THIS EXISTS:
The KB accepts two input types: PDFs and URLs. PDFs are handled by
LlamaIndex's built-in PDF reader. URLs need custom extraction because:
1. Raw HTML is 80% boilerplate (nav, footer, ads, scripts).
2. We need clean prose text, not DOM structure.
3. We need to handle failures gracefully (timeouts, 404s, paywalls).

DESIGN DECISIONS:
- requests + BeautifulSoup over Selenium/Playwright: we're extracting
  static content, not rendering SPAs. 90% of docs, blogs, and wikis
  are server-rendered. Keeps deps minimal and avoids headless browser overhead.
- Strip tags list: <script>, <style>, <nav>, <footer>, <header>, <aside>
  are noise for RAG. Removing them before .get_text() dramatically
  improves chunk quality.
- Timeout of 15s: generous enough for slow servers, short enough to not
  block the UI. Ingestion is not latency-sensitive.
- User-Agent header: some sites block default Python UA. We use a
  generic browser string. Not spoofing — just being a polite client.

WHAT THIS RETURNS:
A dict with 'text' (cleaned content), 'title' (page title), and 'url'.
The ingest pipeline wraps this into a LlamaIndex Document object.
"""

import logging
from typing import Optional
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Tags that are almost never useful for RAG retrieval.
# Removing them before text extraction prevents polluting chunks with
# navigation links, cookie banners, and sidebar widgets.
STRIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"}

# Polite User-Agent — not spoofing, just identifying as a standard client.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; RAG-KB-Bot/1.0; "
        "+https://github.com/yourname/rag-knowledge-base)"
    )
}


@dataclass
class ScrapedPage:
    """Structured output from a successful scrape."""
    url: str
    title: str
    text: str
    word_count: int


def scrape_url(url: str, timeout: int = 15) -> Optional[ScrapedPage]:
    """
    Fetch a URL and extract clean text content.

    Flow:
    1. HTTP GET with timeout + headers.
    2. Parse HTML with BeautifulSoup (html.parser — no lxml dep needed).
    3. Decompose noise tags (script, nav, footer, etc.).
    4. Extract text with single-space separator.
    5. Return structured ScrapedPage or None on failure.

    Returns None (not raises) on failure — the caller decides whether
    a failed URL is fatal or skippable. In our case, we skip and log.
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return None

    # Detect encoding. requests guesses from headers, but some sites
    # serve UTF-8 content with a Latin-1 header. apparent_encoding
    # sniffs the actual bytes (uses chardet under the hood).
    response.encoding = response.apparent_encoding

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove noise elements IN PLACE before extracting text.
    # .decompose() removes the tag AND its children from the tree entirely.
    for tag in soup.find_all(STRIP_TAGS):
        tag.decompose()

    # .get_text(separator=" ") joins all remaining text nodes with spaces.
    # .strip() removes leading/trailing whitespace.
    # The double-space collapse handles cases where decomposed tags
    # leave adjacent spaces.
    text = soup.get_text(separator=" ", strip=True)
    text = " ".join(text.split())  # collapse whitespace runs

    if not text or len(text) < 50:
        logger.warning(f"Scraped content too short from {url} ({len(text)} chars)")
        return None

    title = soup.title.string.strip() if soup.title and soup.title.string else url

    return ScrapedPage(
        url=url,
        title=title,
        text=text,
        word_count=len(text.split()),
    )