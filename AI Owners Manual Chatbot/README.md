# 📖 AI Owners Manual Chatbot

> Upload any PDF manual → ask questions in plain English → get cited answers with page references.

---

## What it does

- **PDF ingestion** via LlamaIndex — chunks and embeds any owners manual
- **RAG Q&A** powered by Claude — answers grounded in the document
- **Source citations** — every answer links back to the exact page and passage
- **Edge case handling** — no-match, ambiguous queries, multi-page context

---

## Tech Stack

| Layer | Tool |
|-------|------|
| LLM | Ollama (local, open-source: llama3.2, mistral, phi3, gemma2, etc.) |
| RAG / Indexing | LlamaIndex `VectorStoreIndex` |
| PDF Extraction | PyMuPDF (clean text from complex PDFs) |
| Embeddings | HuggingFace `BAAI/bge-small-en-v1.5` (free, local) |
| UI | Streamlit |
| Python | 3.10+ |

---

## Quickstart

### Prerequisites
1. **Install Ollama**: Download from [ollama.com](https://ollama.com/download)
2. **Pull a model**: Run `ollama pull llama3.2` (or try `mistral`, `phi3`, `gemma2`)
3. **Start Ollama**: Run `ollama serve` — it will run as a local server on `http://localhost:11434`

### Install & Run

```bash
# 1. Clone and install Python dependencies
cd AI Owners Manual Chatbot
pip install -r requirements.txt

# 2. Run the Streamlit app (Ollama must be running in another terminal)
streamlit run app.py
```

Then open `http://localhost:8501`, upload a PDF, and start asking questions.

---

## Edge Cases Handled

| Scenario | Behaviour |
|----------|-----------|
| Question not in manual | LLM acknowledges lack of source material rather than hallucinating |
| Ambiguous query | Returns top-4 most relevant chunks; LLM synthesizes best answer |
| Multi-page context | Chunks span across pages; LLM considers full context |
| Binary/image data in PDF | Filtered out; citations only show readable text |
| Ollama not running | Clear error message with instructions |
| Empty or corrupt PDF | Error caught and reported to user |

---
