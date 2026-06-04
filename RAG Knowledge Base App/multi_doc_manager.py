"""
multi_doc_manager.py — Week 6 Extension
Handles ingestion and management of multiple documents in ChromaDB.
Each document is stored with rich metadata so the UI can attribute answers to sources.
"""

import os
import hashlib
from pathlib import Path
from typing import Optional
from datetime import datetime

import chromadb
from chromadb.config import Settings
from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
    Settings as LlamaSettings,
)
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama
from llama_index.readers.file import PDFReader
from llama_index.core.schema import Document


# ── Ollama config ─────────────────────────────────────────────────────────────
OLLAMA_MODEL = "llama3"           # swap for llama3.1 if that's your pull name
OLLAMA_BASE_URL = "http://localhost:11434"
CHROMA_PATH = "./chroma_db"       # persisted on disk
COLLECTION_NAME = "rag_docs"

LlamaSettings.llm = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, request_timeout=120.0)
LlamaSettings.embed_model = OllamaEmbedding(
    model_name="nomic-embed-text",   # best free embedding model for Ollama
    base_url=OLLAMA_BASE_URL,
)


def _get_chroma_collection():
    """Return a persistent ChromaDB client + collection."""
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return client, collection


def _file_hash(file_bytes: bytes) -> str:
    """SHA-256 of file content — used to detect duplicates."""
    return hashlib.sha256(file_bytes).hexdigest()


def list_ingested_docs() -> list[dict]:
    """
    Return metadata for every document already in the collection.
    Each entry: {doc_id, filename, ingested_at, chunk_count, source_type}
    """
    _, collection = _get_chroma_collection()
    results = collection.get(include=["metadatas"])
    if not results["metadatas"]:
        return []

    seen = {}
    for meta in results["metadatas"]:
        doc_id = meta.get("doc_id", "unknown")
        if doc_id not in seen:
            seen[doc_id] = {
                "doc_id": doc_id,
                "filename": meta.get("filename", "unknown"),
                "ingested_at": meta.get("ingested_at", ""),
                "source_type": meta.get("source_type", "unknown"),
                "chunk_count": 0,
            }
        seen[doc_id]["chunk_count"] += 1

    return list(seen.values())


def delete_doc(doc_id: str) -> int:
    """Remove all chunks belonging to a doc_id. Returns number of chunks deleted."""
    _, collection = _get_chroma_collection()
    results = collection.get(where={"doc_id": doc_id}, include=["metadatas"])
    ids_to_delete = results["ids"]
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
    return len(ids_to_delete)


def ingest_pdf(file_bytes: bytes, filename: str) -> dict:
    """
    Ingest a PDF file into ChromaDB.
    Returns {doc_id, filename, chunk_count, already_existed}
    """
    doc_id = _file_hash(file_bytes)

    # Check if already ingested
    _, collection = _get_chroma_collection()
    existing = collection.get(where={"doc_id": doc_id}, include=["metadatas"])
    if existing["ids"]:
        return {
            "doc_id": doc_id,
            "filename": filename,
            "chunk_count": len(existing["ids"]),
            "already_existed": True,
        }

    # Write to a temp file so LlamaIndex can read it
    tmp_path = Path(f"/tmp/{filename}")
    tmp_path.write_bytes(file_bytes)

    reader = PDFReader()
    llama_docs = reader.load_data(file=tmp_path)

    # Stamp each document node with metadata
    for doc in llama_docs:
        doc.metadata.update({
            "doc_id": doc_id,
            "filename": filename,
            "source_type": "pdf",
            "ingested_at": datetime.utcnow().isoformat(),
        })

    chunk_count = _index_documents(llama_docs, collection)
    tmp_path.unlink(missing_ok=True)

    return {
        "doc_id": doc_id,
        "filename": filename,
        "chunk_count": chunk_count,
        "already_existed": False,
    }


def ingest_url(url: str) -> dict:
    """
    Fetch and ingest a web URL.
    Returns {doc_id, url, chunk_count, already_existed}
    Requires: pip install llama-index-readers-web
    """
    from llama_index.readers.web import SimpleWebPageReader

    doc_id = _file_hash(url.encode())

    _, collection = _get_chroma_collection()
    existing = collection.get(where={"doc_id": doc_id}, include=["metadatas"])
    if existing["ids"]:
        return {
            "doc_id": doc_id,
            "filename": url,
            "chunk_count": len(existing["ids"]),
            "already_existed": True,
        }

    reader = SimpleWebPageReader(html_to_text=True)
    llama_docs = reader.load_data(urls=[url])

    for doc in llama_docs:
        doc.metadata.update({
            "doc_id": doc_id,
            "filename": url,
            "source_type": "url",
            "ingested_at": datetime.utcnow().isoformat(),
        })

    chunk_count = _index_documents(llama_docs, collection)

    return {
        "doc_id": doc_id,
        "filename": url,
        "chunk_count": chunk_count,
        "already_existed": False,
    }


def _index_documents(llama_docs: list[Document], collection) -> int:
    """
    Chunk, embed, and store documents in ChromaDB.
    Returns the number of chunks stored.
    """
    client, _ = _get_chroma_collection()
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    VectorStoreIndex.from_documents(
        llama_docs,
        storage_context=storage_context,
        show_progress=False,
    )

    # Re-fetch to count how many chunks were added
    updated = collection.get(
        where={"doc_id": llama_docs[0].metadata["doc_id"]},
        include=["metadatas"],
    )
    return len(updated["ids"])


def get_vector_store_index(doc_ids: Optional[list[str]] = None):
    """
    Load the ChromaDB collection as a LlamaIndex VectorStoreIndex.
    If doc_ids is provided, only chunks from those docs are queried.
    NOTE: LlamaIndex ChromaVectorStore doesn't support pre-query filtering natively;
    we handle this at retrieval time in rag_engine.py via metadata post-filtering.
    """
    client, collection = _get_chroma_collection()
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_vector_store(
        vector_store,
        storage_context=storage_context,
    )
    return index