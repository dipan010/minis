"""
ingestion.py — PDF extraction and LlamaIndex vector indexing.

Uses pymupdf (fitz) for clean text extraction — it renders pages as reading-order
text flow, stripping all internal PDF structure (/StructElem, binary streams, etc.)
which is what plagued SimpleDirectoryReader + pypdf on complex PDFs.
"""

import hashlib

import fitz  # pymupdf
from llama_index.core import VectorStoreIndex
from llama_index.core.schema import Document

try:
    import streamlit as st
except ImportError:
    st = None  # type: ignore[assignment]

# Module-level cache for non-Streamlit contexts (FastAPI / A2A)
_index_cache: dict[str, VectorStoreIndex] = {}


def extract_pages(file_bytes: bytes) -> list[Document]:
    """
    Extract clean plain text from a PDF, one LlamaIndex Document per page.
    Skips blank pages and image-only pages.

    Returns a list of Documents with metadata: {page, page_label}.
    """
    docs = []
    pdf  = fitz.open(stream=file_bytes, filetype="pdf")

    for page_num, page in enumerate(pdf, start=1):
        text = page.get_text("text").strip()
        if not text:
            continue   # skip blank / image-only pages
        docs.append(Document(
            text=text,
            metadata={"page": page_num, "page_label": str(page_num)},
        ))

    pdf.close()
    return docs


def get_page_text(file_bytes: bytes, page_num: int) -> tuple[str, int]:
    """
    Extract text from a specific page for the preview panel.
    Returns (page_text, total_pages).
    """
    try:
        pdf         = fitz.open(stream=file_bytes, filetype="pdf")
        total_pages = len(pdf)
        page_idx    = min(page_num - 1, total_pages - 1)
        text        = pdf[page_idx].get_text("text").strip()
        pdf.close()
        return text, total_pages
    except Exception:
        return "Could not render page.", 1


def make_snippet(text: str, max_len: int = 200) -> str:
    """Collapse whitespace and truncate a chunk for use as a citation preview."""
    preview = " ".join(text.split())
    return preview[:max_len] + ("…" if len(preview) > max_len else "")


def _build_index_impl(file_bytes: bytes, filename: str) -> VectorStoreIndex:
    """Core index building logic — used by both Streamlit and API contexts."""
    docs = extract_pages(file_bytes)
    if not docs:
        raise ValueError(
            "No readable text found. This PDF may be a scanned image — "
            "try a text-based PDF."
        )
    return VectorStoreIndex.from_documents(docs)


def build_index(file_bytes: bytes, filename: str) -> VectorStoreIndex:
    """
    Build a VectorStoreIndex from PDF bytes, with caching.

    In Streamlit context: uses @st.cache_resource for session-aware caching.
    In API context: uses a module-level dict cache keyed by content hash.

    Raises ValueError if no readable text is found (e.g. scanned image PDF).
    """
    if st is not None and hasattr(st, "cache_resource"):
        # Streamlit context — delegate to the cached wrapper
        @st.cache_resource(show_spinner=False)
        def _cached_build(fb: bytes, fn: str) -> VectorStoreIndex:
            return _build_index_impl(fb, fn)
        return _cached_build(file_bytes, filename)

    # API / non-Streamlit context — use module-level cache
    cache_key = hashlib.md5(file_bytes).hexdigest() + ":" + filename
    if cache_key not in _index_cache:
        _index_cache[cache_key] = _build_index_impl(file_bytes, filename)
    return _index_cache[cache_key]