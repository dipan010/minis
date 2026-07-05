"""
api/server.py — FastAPI REST API.

WHY THIS EXISTS:
The Streamlit UI talks to the RAG pipeline through this API. But more
importantly, having a REST API means the KB is usable WITHOUT Streamlit:
- curl commands for scripting
- Integrate with Slack bots, Telegram bots, or any frontend
- Load testing with ab/wrk/k6
- Future: swap Streamlit for a React frontend without touching backend

ARCHITECTURE PRINCIPLE:
This file is a THIN LAYER. It handles:
- HTTP concerns (request parsing, file uploads, response formatting)
- Error handling (try/except → proper HTTP status codes)
- CORS (so a JS frontend on a different port can call it)

It does NOT handle:
- Chunking, embedding, or retrieval (that's core/ingest.py)
- LLM calls (that's core/query.py)
- HTML scraping (that's core/scraper.py)

ENDPOINTS:
  POST /ingest/pdf      — Upload a PDF file → ingest into KB
  POST /ingest/url      — Submit a URL → scrape and ingest
  POST /query           — Ask a question → get answer + citations
  GET  /sources         — List all ingested sources
  DELETE /sources       — Clear the entire knowledge base

DESIGN DECISIONS:
- UploadFile for PDFs: FastAPI streams the file to disk, then we process.
  No in-memory buffering of large PDFs.
- Pydantic models for request/response: auto-generates OpenAPI docs at /docs.
- CORS with allow_origins=["*"]: permissive for dev. Lock this down in prod.
- No auth: this is a local-only tool. Add API keys if deploying remotely.
"""

import shutil
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from core.ingest import ingest_pdf, ingest_url, list_sources, clear_collection
from core.query import query_knowledge_base
from api.a2a_handler import a2a_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App init ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="RAG Knowledge Base API",
    description="Ingest documents, ask questions, get cited answers.",
    version="1.0.0",
)

# CORS — allow any origin in dev. In production, replace "*" with
# your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── A2A Protocol Endpoints ──────────────────────────────────────────────
app.include_router(a2a_router)


# ── Request / Response models ────────────────────────────────────────────
class URLRequest(BaseModel):
    url: str


class QueryRequest(BaseModel):
    question: str
    chat_history: Optional[list[dict]] = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    confidence: float
    chunks_used: int


class IngestResponse(BaseModel):
    status: str
    source: Optional[str] = None
    message: Optional[str] = None
    pages_ingested: Optional[int] = None
    word_count: Optional[int] = None
    source_type: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────

@app.post("/ingest/pdf", response_model=IngestResponse)
async def ingest_pdf_endpoint(file: UploadFile = File(...)):
    """
    Upload and ingest a PDF into the knowledge base.

    Flow:
    1. Validate file extension (.pdf only).
    2. Stream-save to upload_dir (avoids loading entire PDF in memory).
    3. Pass file path to core/ingest.py for processing.
    4. Clean up the uploaded file after processing.
    5. Return ingestion stats.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Save uploaded file to disk.
    settings.ensure_dirs()
    save_path = Path(settings.upload_dir) / file.filename

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Ingest the saved PDF.
    try:
        result = ingest_pdf(str(save_path), filename=file.filename)
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")
    finally:
        # Clean up — the PDF content is now in ChromaDB, we don't need
        # the raw file anymore. Keeps disk usage predictable.
        save_path.unlink(missing_ok=True)

    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    return IngestResponse(**result)


@app.post("/ingest/url", response_model=IngestResponse)
async def ingest_url_endpoint(request: URLRequest):
    """
    Scrape a URL and ingest its content into the knowledge base.

    Validates the URL starts with http(s), then delegates to core/ingest.py.
    """
    url = request.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    try:
        result = ingest_url(url)
    except Exception as e:
        logger.error(f"URL ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    return IngestResponse(**result)


@app.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """
    Ask a question against the knowledge base.

    Accepts optional chat_history for follow-up questions.
    Returns the answer, source citations, confidence, and chunk count.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = query_knowledge_base(
            question=request.question,
            chat_history=request.chat_history,
        )
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

    return QueryResponse(
        answer=result.answer,
        sources=result.sources,
        confidence=result.confidence,
        chunks_used=result.chunks_used,
    )


@app.get("/sources")
async def get_sources():
    """List all ingested sources with chunk counts."""
    try:
        return {"sources": list_sources()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sources")
async def delete_sources():
    """
    Clear the entire knowledge base. Destructive — no undo.
    Used by the 'Reset KB' button in the Streamlit UI.
    """
    try:
        clear_collection()
        return {"status": "cleared", "message": "Knowledge base has been reset."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Basic health check — used by Streamlit to verify API is running."""
    return {"status": "healthy", "model": settings.llm_model}