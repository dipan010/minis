# 🔍 KnowledgeForge — RAG Knowledge Base

> Ingest PDFs and URLs → ask questions → get cited answers. 100% local, zero API costs.


---

## What It Does

Upload any document (PDF or web URL) into a persistent knowledge base. Ask questions in natural language and get answers that cite exactly which document and page the information came from — with a confidence score showing how well the KB matched your query.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Streamlit UI (app.py)               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ PDF Upload   │  │ URL Input    │  │ Chat UI     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
└─────────┼─────────────────┼─────────────────┼────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ core/ingest.py  │ │core/scraper │ │  core/query.py  │
│                 │ │   .py       │ │                 │
│ PyMuPDF → text  │ │ requests +  │ │ Embed question  │
│ Chunk (512 tok) │ │ BeautifulSo │ │ Retrieve top-5  │
│ Embed (nomic)   │ │ up → clean  │ │ Generate answer │
│ Store (Chroma)  │ │ text        │ │ Cite sources    │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────┐
│              ChromaDB (persistent on disk)            │
│         ~/.rag-kb/chroma_db/                          │
│    vectors + metadata (source, page, type)            │
└──────────────────────────────────────────────────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  nomic-embed-text│              │   llama3.1:8b    │
│  (via Ollama)    │              │   (via Ollama)   │
│  768-dim vectors │              │  answer generation│
└──────────────────┘              └──────────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| RAG Framework | LlamaIndex | Purpose-built for retrieval; cleaner RAG API than LangChain |
| Vector DB | ChromaDB | Embedded, persistent, zero-config |
| Embeddings | nomic-embed-text (Ollama) | 768-dim, 8K context, runs locally via Ollama |
| LLM | llama3.1:8b (Ollama) | Strong instruction-following, good at citing sources |
| PDF Parser | PyMuPDF (fitz) | 10x faster than PyPDF2, better text extraction |
| Web Scraper | requests + BeautifulSoup | Lightweight, no headless browser overhead |
| API | FastAPI | Auto-generates OpenAPI docs, async support |
| UI | Streamlit | Rapid prototyping, built-in chat components |

## Quick Start

```bash
# 1. Prerequisites — Ollama must be running
ollama serve
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# 2. Clone and install
git clone https://github.com/yourname/rag-knowledge-base.git
cd rag-knowledge-base
pip install -r requirements.txt

# 3. (Optional) Copy and edit environment config
cp .env.example .env

# 4. Run the Streamlit UI
streamlit run app.py

# 5. (Optional) Run the FastAPI server for programmatic access
uvicorn api.server:app --reload
```

Open http://localhost:8501 for the UI, or http://localhost:8000/docs for the API.

## Usage

### Ingest Documents
1. **PDFs** — Use the sidebar file uploader. Drop one or multiple PDFs.
2. **URLs** — Paste any web URL in the sidebar. The scraper extracts clean text.

### Ask Questions
Type your question in the chat input. The system:
- Embeds your question into the same vector space as the stored chunks.
- Retrieves the 5 most relevant chunks from ChromaDB.
- Sends them + your question to llama3.1:8b.
- Returns an answer with source citations and confidence score.

### Follow-up Questions
The chat maintains history (last 3 turns). You can ask follow-up questions naturally:
- "What about the second point?"
- "Explain that in more detail"
- "Compare that with what the other document says"

### API Endpoints
```bash
# Upload a PDF
curl -X POST http://localhost:8000/ingest/pdf \
  -F "file=@manual.pdf"

# Ingest a URL
curl -X POST http://localhost:8000/ingest/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.example.com/guide"}'

# Ask a question
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I reset the device?"}'

# List sources
curl http://localhost:8000/sources

# Clear knowledge base
curl -X DELETE http://localhost:8000/sources
```

## Project Structure

```
rag-knowledge-base/
├── app.py              # Streamlit UI — chat + ingestion sidebar
├── config.py           # Central config — all tunables, env-overridable
├── api/
│   ├── __init__.py
│   └── server.py       # FastAPI REST API — thin wrapper over core/
├── core/
│   ├── __init__.py
│   ├── ingest.py       # Ingestion pipeline — PDF/URL → chunks → ChromaDB
│   ├── query.py        # RAG query engine — retrieve + generate + cite
│   └── scraper.py      # URL content extraction — HTML → clean text
├── requirements.txt
├── .env
└── README.md
```

## Configuration

All settings are in `config.py` and overridable via environment variables. Key tuning knobs:

| Setting | Default | What it controls |
|---|---|---|
| `CHUNK_SIZE` | 512 | Tokens per chunk. Larger = more context, diluted embeddings |
| `CHUNK_OVERLAP` | 64 | Overlap window. Prevents cutting mid-sentence |
| `TOP_K` | 5 | Chunks retrieved per query. More = broader recall, more noise |
| `RESPONSE_MODE` | compact | "compact" = 1 LLM call. "refine" = 1 per chunk (slower, thorough) |
| `LLM_MODEL` | llama3.1:8b | Any Ollama model. Try mistral:7b for speed |
| `EMBED_MODEL` | nomic-embed-text | Embedding model. Must match what was used during ingestion |

## What I'd Do Next 

- [ ] **Multi-doc filtering** — query specific documents, not the whole KB
- [ ] **Conversation memory** — persist chat history across sessions
- [ ] **Hybrid search** — combine vector similarity with BM25 keyword search
- [ ] **Streaming responses** — token-by-token output instead of waiting for full answer
- [ ] **Document management** — delete individual sources without clearing the whole KB
- [ ] **Export** — download answers as Markdown with citations

## Inspired By

Cintas (company knowledge management), Iron Mountain (document intelligence), Freshfields (legal knowledge base).
