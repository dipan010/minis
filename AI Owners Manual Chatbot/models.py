"""
models.py — LLM and embedding configuration.

Only Ollama/llama3.2 is wired up. Other models are not placeholders here —
if you pull a different model via `ollama pull <name>`, just change OLLAMA_MODEL.
"""

from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# ── Active model ──────────────────────────────────────────────────────────────
OLLAMA_MODEL   = "llama3.2"
OLLAMA_URL     = "http://localhost:11434"
REQUEST_TIMEOUT = 120.0

# ── Chunk settings ────────────────────────────────────────────────────────────
CHUNK_SIZE    = 512
CHUNK_OVERLAP = 64

# ── Embed model (runs locally on CPU, no API call) ────────────────────────────
EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"


def configure_settings() -> None:
    """
    Call once at app startup. Sets the global LlamaIndex Settings singleton
    so every component (indexer, query engine, retriever) picks them up
    without needing explicit arguments.
    """
    Settings.llm = Ollama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_URL,
        request_timeout=REQUEST_TIMEOUT,
    )
    Settings.embed_model = HuggingFaceEmbedding(model_name=EMBED_MODEL_NAME)
    Settings.node_parser  = SentenceSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )


def get_llm() -> Ollama:
    """Return a fresh Ollama LLM instance (used by skills for per-call overrides)."""
    return Ollama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_URL,
        request_timeout=REQUEST_TIMEOUT,
    )