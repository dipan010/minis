"""
ingestion.py — PDF extraction and LlamaIndex vector indexing.

Uses pymupdf (fitz) for clean text extraction — it renders pages as reading-order
text flow, stripping all internal PDF structure (/StructElem, binary streams, etc.)
which is what plagued SimpleDirectoryReader + pypdf on complex PDFs.
"""

import fitz  # pymupdf
import streamlit as st
from llama_index.core import VectorStoreIndex
from llama_index.core.schema import Document


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


@st.cache_resource(show_spinner=False)
def build_index(file_bytes: bytes, filename: str) -> VectorStoreIndex:
    """
    Build a VectorStoreIndex from PDF bytes.

    Cached with @st.cache_resource — runs once per unique (file_bytes, filename)
    pair. Streamlit reuses the cached index on subsequent re-runs, so re-indexing
    never happens unless a new file is uploaded.

    Raises ValueError if no readable text is found (e.g. scanned image PDF).
    """
    docs = extract_pages(file_bytes)
    if not docs:
        raise ValueError(
            "No readable text found. This PDF may be a scanned image — "
            "try a text-based PDF."
        )
    return VectorStoreIndex.from_documents(docs)