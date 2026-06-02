"""
core/ingest.py — Document ingestion pipeline.

THIS IS THE CORE OF THE ENTIRE PROJECT.

The pipeline does one thing: take raw documents (PDF files or URLs),
chunk them into semantically meaningful pieces, embed each chunk into
a 768-dimensional vector, and store those vectors + metadata in ChromaDB
for later retrieval.

ARCHITECTURE (what happens when you upload a doc):

  PDF/URL
    │
    ▼
  [1] Parse — extract raw text (PyMuPDF for PDFs, BeautifulSoup for URLs)
    │
    ▼
  [2] Chunk — split text into overlapping 512-token windows
    │         (SentenceSplitter, not naive char split)
    │
    ▼
  [3] Embed — each chunk → 768-dim vector via nomic-embed-text (Ollama)
    │
    ▼
  [4] Store — vectors + metadata → ChromaDB (persistent on disk)

WHY THESE CHOICES:

1. LlamaIndex over LangChain for RAG:
   - LlamaIndex is purpose-built for retrieval. LangChain is a general
     agent framework that bolted on RAG later.
   - LlamaIndex's VectorStoreIndex handles chunking → embedding → storage
     in a single .from_documents() call. LangChain needs 4 separate objects.
   - The query engine abstraction (index.as_query_engine) wires retrieval
     + LLM generation + citation tracking with zero glue code.

2. ChromaDB over FAISS/Pinecone/Weaviate:
   - Runs embedded (in-process), no server to manage.
   - Persistent storage with a single path argument.
   - Free, open source, and good enough for <100K documents.
   - FAISS is faster but doesn't persist natively and has no metadata filtering.
   - Pinecone/Weaviate are cloud services — this project runs 100% local.

3. nomic-embed-text over sentence-transformers:
   - Runs through Ollama, same as the LLM. One runtime, one dependency.
   - 768 dimensions, 8192 token context — handles long chunks.
   - Competitive with OpenAI ada-002 on MTEB benchmarks.
   - No Python-side model loading = lower RAM than loading a HuggingFace model.

4. SentenceSplitter over naive chunking:
   - Splits on sentence boundaries, not raw character counts.
   - A chunk that ends mid-sentence produces a garbage embedding.
   - The overlap window (64 tokens) prevents losing context at boundaries.
   - Example: a paragraph about "installation requirements" won't be split
     so that "requirements" ends up in chunk N and the actual requirements
     list starts in chunk N+1.

METADATA STRATEGY:
Every chunk gets metadata: source filename/URL, page number (for PDFs),
chunk index, and document title. This powers the citation UI — when the
query engine returns a chunk, the frontend shows "Source: manual.pdf, p.12".
"""

import logging
import hashlib
from pathlib import Path
from typing import Optional

import chromadb
from llama_index.core import (
    Document,
    Settings as LlamaSettings,
    StorageContext,
    VectorStoreIndex,
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.chroma import ChromaVectorStore

from config import settings
from core.scraper import scrape_url

logger = logging.getLogger(__name__)


def _configure_llama_index():
    """
    Set LlamaIndex's global defaults to use Ollama for both
    embeddings and generation.

    WHY GLOBAL SETTINGS:
    LlamaIndex uses a Settings singleton. If you don't set it, it
    defaults to OpenAI — which fails without an API key. Setting it
    once here means every index and query engine automatically uses
    Ollama without passing model objects around.
    """
    LlamaSettings.llm = Ollama(
        model=settings.llm_model,
        base_url=settings.ollama_base_url,
        request_timeout=120.0,  # llama3.1:8b can be slow on CPU
    )
    LlamaSettings.embed_model = OllamaEmbedding(
        model_name=settings.embed_model,
        base_url=settings.ollama_base_url,
    )
    LlamaSettings.node_parser = SentenceSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )


def _get_chroma_store() -> ChromaVectorStore:
    """
    Initialize ChromaDB client and return a LlamaIndex-compatible
    vector store wrapper.

    ChromaDB runs in 'persistent client' mode — data is written to
    disk at chroma_persist_dir. Restarting the app doesn't lose your
    indexed documents. The collection_name acts as a namespace — you
    could run multiple KBs on the same Chroma instance.
    """
    settings.ensure_dirs()
    chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    chroma_collection = chroma_client.get_or_create_collection(
        name=settings.collection_name
    )
    return ChromaVectorStore(chroma_collection=chroma_collection)


def _doc_id(content: str, source: str) -> str:
    """
    Generate a deterministic document ID from content + source.

    WHY: prevents re-ingesting the same document. If you upload
    manual.pdf twice, the second upload is a no-op because the
    hash matches. Uses SHA-256 truncated to 16 hex chars — collision
    probability is negligible for our scale.
    """
    raw = f"{source}:{content[:1000]}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def get_or_create_index() -> VectorStoreIndex:
    """
    Load the existing index from ChromaDB, or create an empty one.

    This is the main entry point for both ingestion (add docs to index)
    and querying (search the index). The VectorStoreIndex wraps ChromaDB
    and provides .insert() for adding documents and .as_query_engine()
    for retrieval.
    """
    _configure_llama_index()
    vector_store = _get_chroma_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        storage_context=storage_context,
    )


def ingest_pdf(file_path: str, filename: Optional[str] = None) -> dict:
    """
    Ingest a PDF file into the knowledge base.

    Flow:
    1. Read PDF with PyMuPDF (fitz) — extracts text per page.
    2. Wrap each page as a LlamaIndex Document with metadata.
    3. Insert into the existing VectorStoreIndex.
    4. Return stats (pages ingested, chunks created).

    WHY PyMuPDF (fitz) OVER PyPDF2:
    - 10x faster on large PDFs.
    - Better text extraction (handles columns, tables, headers).
    - Actively maintained. PyPDF2 was archived, PyPDF is the successor
      but fitz still wins on extraction quality.
    """
    import fitz  # PyMuPDF

    path = Path(file_path)
    display_name = filename or path.name

    doc = fitz.open(file_path)
    documents = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        # Skip near-empty pages (cover pages, blank separators).
        if not text or len(text.strip()) < 30:
            continue

        documents.append(
            Document(
                text=text,
                metadata={
                    "source": display_name,
                    "source_type": "pdf",
                    "page": page_num + 1,  # 1-indexed for humans
                    "total_pages": len(doc),
                    "doc_id": _doc_id(text, display_name),
                },
            )
        )

    doc.close()

    if not documents:
        return {"status": "error", "message": f"No extractable text in {display_name}"}

    # Get or create the index, then insert new documents.
    # .insert() chunks → embeds → stores in one call.
    index = get_or_create_index()
    for d in documents:
        index.insert(d)

    logger.info(f"Ingested {display_name}: {len(documents)} pages")

    return {
        "status": "success",
        "source": display_name,
        "pages_ingested": len(documents),
        "source_type": "pdf",
    }


def ingest_url(url: str) -> dict:
    """
    Scrape a URL and ingest its content into the knowledge base.

    Flow:
    1. Scrape URL → clean text via core/scraper.py.
    2. Wrap as a single LlamaIndex Document (URLs are one "page").
    3. Insert into VectorStoreIndex.

    WHY ONE DOCUMENT PER URL (not chunked before insert):
    LlamaIndex's SentenceSplitter handles chunking during .insert().
    We don't pre-chunk — that would bypass the sentence-boundary logic
    and the overlap window. We give it the full text and let the node
    parser do its job.
    """
    scraped = scrape_url(url)
    if scraped is None:
        return {"status": "error", "message": f"Could not scrape {url}"}

    document = Document(
        text=scraped.text,
        metadata={
            "source": scraped.title,
            "source_type": "url",
            "url": scraped.url,
            "word_count": scraped.word_count,
            "doc_id": _doc_id(scraped.text, url),
        },
    )

    index = get_or_create_index()
    index.insert(document)

    logger.info(f"Ingested URL: {scraped.title} ({scraped.word_count} words)")

    return {
        "status": "success",
        "source": scraped.title,
        "word_count": scraped.word_count,
        "source_type": "url",
    }


def list_sources() -> list[dict]:
    """
    List all unique sources currently in the knowledge base.

    Queries ChromaDB metadata directly (not through LlamaIndex) because
    we need collection-level stats, not retrieval results. Returns
    deduplicated source names with their types and chunk counts.
    """
    settings.ensure_dirs()
    chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)

    try:
        collection = chroma_client.get_collection(name=settings.collection_name)
    except Exception:
        return []

    # Get all metadata from the collection.
    results = collection.get(include=["metadatas"])

    if not results or not results["metadatas"]:
        return []

    # Deduplicate by source name and aggregate chunk counts.
    sources: dict[str, dict] = {}
    for meta in results["metadatas"]:
        source = meta.get("source", "Unknown")
        if source not in sources:
            sources[source] = {
                "source": source,
                "source_type": meta.get("source_type", "unknown"),
                "chunks": 0,
            }
        sources[source]["chunks"] += 1

    return list(sources.values())


def clear_collection():
    """
    Delete ALL documents from the knowledge base.

    Nuclear option — used for the 'Reset KB' button in the UI.
    Deletes the ChromaDB collection entirely and recreates it empty.
    """
    settings.ensure_dirs()
    chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    try:
        chroma_client.delete_collection(name=settings.collection_name)
        logger.info(f"Cleared collection: {settings.collection_name}")
    except Exception:
        pass  # Collection didn't exist — that's fine