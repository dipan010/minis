"""
config.py — Central configuration for the RAG Knowledge Base.

WHY THIS FILE EXISTS:
Every tunable parameter lives here. No magic numbers buried in business
logic. Every value is overridable via environment variables so you can
go from dev → staging → prod without touching code.

DESIGN DECISIONS:
- dataclass over pydantic: zero external deps for config. This is a
  config object, not a request validator.
- os.environ.get with defaults: works without a .env file out of the box,
  but respects one if present (loaded via python-dotenv in the entrypoints).
- Chunk size 512 / overlap 64: this is the sweet spot for technical docs.
  Too small (128) = fragments lose context. Too large (1024) = embeddings
  get diluted by unrelated sentences. Overlap prevents hard cuts mid-sentence.
- top_k=5: retrieves 5 chunks per query. Enough for multi-paragraph answers
  without flooding the LLM context window.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Settings:
    # ── Ollama ────────────────────────────────────────────────────────────
    ollama_base_url: str = field(
        default_factory=lambda: os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    llm_model: str = field(
        default_factory=lambda: os.environ.get("LLM_MODEL", "llama3.1:8b")
    )
    embed_model: str = field(
        default_factory=lambda: os.environ.get("EMBED_MODEL", "nomic-embed-text")
    )

    # ── Chunking ──────────────────────────────────────────────────────────
    # chunk_size: how many tokens per chunk. 512 = ~1 paragraph of dense text.
    # chunk_overlap: sliding window overlap. Prevents cutting mid-thought.
    chunk_size: int = field(
        default_factory=lambda: int(os.environ.get("CHUNK_SIZE", "512"))
    )
    chunk_overlap: int = field(
        default_factory=lambda: int(os.environ.get("CHUNK_OVERLAP", "64"))
    )

    # ── Retrieval ─────────────────────────────────────────────────────────
    # top_k: number of chunks retrieved per query. 5 balances recall vs noise.
    # response_mode: "compact" merges retrieved chunks before sending to LLM,
    #   reducing token usage vs "refine" which calls the LLM per chunk.
    top_k: int = field(
        default_factory=lambda: int(os.environ.get("TOP_K", "5"))
    )
    response_mode: str = field(
        default_factory=lambda: os.environ.get("RESPONSE_MODE", "compact")
    )

    # ── Storage ───────────────────────────────────────────────────────────
    # ChromaDB persists here. Survives restarts. Delete this folder to reset.
    chroma_persist_dir: str = field(
        default_factory=lambda: os.environ.get(
            "CHROMA_PERSIST_DIR",
            str(Path.home() / ".rag-kb" / "chroma_db")
        )
    )
    # Upload staging area — files land here before ingestion.
    upload_dir: str = field(
        default_factory=lambda: os.environ.get(
            "UPLOAD_DIR",
            str(Path.home() / ".rag-kb" / "uploads")
        )
    )

    # ── Collection ────────────────────────────────────────────────────────
    # ChromaDB collection name. One collection = one knowledge base.
    # Change this to run multiple isolated KBs on the same Chroma instance.
    collection_name: str = field(
        default_factory=lambda: os.environ.get("COLLECTION_NAME", "rag_kb_main")
    )

    # ── API ───────────────────────────────────────────────────────────────
    api_host: str = field(
        default_factory=lambda: os.environ.get("API_HOST", "0.0.0.0")
    )
    api_port: int = field(
        default_factory=lambda: int(os.environ.get("API_PORT", "8000"))
    )

    def ensure_dirs(self):
        """Create storage directories if they don't exist."""
        Path(self.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)


# Module-level singleton — import this everywhere.
settings = Settings()