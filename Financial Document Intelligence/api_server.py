"""
api_server.py — FastAPI server for Financial Document Intelligence (FinLens).

Run with: uvicorn api_server:app --host 0.0.0.0 --port 8000
"""

import io
import logging
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transaction_parser import parse_csv, summary_stats
from lib.pipeline import run_full_analysis
from a2a_handler import a2a_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App init ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FinLens API",
    description="AI-powered bank statement analysis: parse, categorize, aggregate, detect anomalies, and generate insights.",
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


# ── Request models ──────────────────────────────────────────────────────────

class AnalyzeConfig(BaseModel):
    model: Optional[str] = "llama3.1:8b"
    ollama_url: Optional[str] = "http://localhost:11434"


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_statement(
    file: UploadFile = File(...),
    model: str = "llama3.1:8b",
    ollama_url: str = "http://localhost:11434",
):
    """Upload a CSV bank statement and run the full analysis pipeline."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    csv_source = io.BytesIO(content)

    try:
        return run_full_analysis(csv_source, ollama_model=model, ollama_url=ollama_url)
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.post("/parse")
async def parse_only(file: UploadFile = File(...)):
    """Parse a CSV bank statement without LLM categorization — returns raw stats."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    csv_source = io.BytesIO(content)

    try:
        df = parse_csv(csv_source)
        stats = summary_stats(df)
        return {"stats": stats, "rows": len(df), "columns": list(df.columns)}
    except Exception as e:
        logger.error(f"Parsing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {e}")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
