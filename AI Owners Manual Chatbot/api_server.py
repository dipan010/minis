"""
api_server.py — FastAPI server for the AI Owners Manual Chatbot.

Exposes REST + A2A endpoints. The Streamlit UI (app.py) continues to work
independently — this server provides an API-first interface for agent-to-agent
communication and programmatic access.

Run with: uvicorn api_server:app --host 0.0.0.0 --port 8000
"""

import logging
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import configure_settings
from ingestion import build_index
from skills import run_skill, get_router, SKILLS

from a2a_handler import a2a_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Initialize LlamaIndex settings ──────────────────────────────────────────
configure_settings()

# ── App init ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Owners Manual Chatbot API",
    description="Upload product manuals and ask questions with semantic skill routing.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── A2A Protocol Endpoints ──────────────────────────────────────────────────
app.include_router(a2a_router)

# ── Module-level state ──────────────────────────────────────────────────────
# Stores the current index per session (simplified: single global index for API)
_current_index = None
_current_filename = None


# ── Request / Response models ───────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    force_skill: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    skill_used: str
    skill_label: str
    similarity: float


class IngestResponse(BaseModel):
    status: str
    filename: str
    pages: int


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/ingest", response_model=IngestResponse)
async def ingest_manual(file: UploadFile = File(...)):
    """Upload a PDF product manual and build a vector index."""
    global _current_index, _current_filename

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()

    try:
        _current_index = build_index(file_bytes, file.filename)
        _current_filename = file.filename
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    from ingestion import extract_pages
    pages = len(extract_pages(file_bytes))

    return IngestResponse(status="success", filename=file.filename, pages=pages)


@app.post("/query", response_model=QueryResponse)
async def query_manual(request: QueryRequest):
    """Ask a question against the currently loaded manual."""
    if _current_index is None:
        raise HTTPException(
            status_code=400,
            detail="No manual loaded. Upload a PDF first via POST /ingest.",
        )

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        router = get_router()
        result = run_skill(
            index=_current_index,
            question=request.question,
            router=router,
            force_skill=request.force_skill,
        )
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

    return QueryResponse(**result)


@app.get("/skills")
async def list_skills():
    """List available skills and their descriptions."""
    return {
        name: {"label": skill["label"], "utterance_count": len(skill["utterances"])}
        for name, skill in SKILLS.items()
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "manual_loaded": _current_filename is not None,
        "current_manual": _current_filename,
    }
