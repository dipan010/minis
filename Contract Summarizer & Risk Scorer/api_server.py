"""
api_server.py — FastAPI server for the Contract Summarizer & Risk Scorer.

Run with: uvicorn api_server:app --host 0.0.0.0 --port 8000
"""

import logging
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from lib.analyzer import extract_pdf_text, analyze_contract
from a2a_handler import a2a_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App init ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ContractIQ API",
    description="Analyze contracts for risk, summarize clauses in plain English, and score risk.",
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


# ── Request / Response models ───────────────────────────────────────────────

class AnalyzeTextRequest(BaseModel):
    contract_text: str
    model: Optional[str] = "mistral:7b"


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_text(request: AnalyzeTextRequest):
    """Analyze contract from plain text."""
    if not request.contract_text.strip():
        raise HTTPException(status_code=400, detail="Contract text cannot be empty")

    try:
        return analyze_contract(request.contract_text, request.model or "mistral:7b")
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.post("/analyze/pdf")
async def analyze_pdf(file: UploadFile = File(...), model: str = "mistral:7b"):
    """Upload a PDF contract and analyze it."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    text = extract_pdf_text(file_bytes)

    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in PDF")

    try:
        return analyze_contract(text, model)
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
