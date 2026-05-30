# MeetingMind 🧠

> AI Meeting Notes → Action Items  
> Stack: Next.js · Tailwind CSS · Ollama (llama3.1:8b) · Vercel  
> Inspired by MERGE, BBVA

Paste any meeting transcript and instantly get:
- ✅ Structured **action items** with owner, deadline, and priority
- 🗳️ **Decisions** that were made
- 💡 **Key points** and discussion highlights
- 📝 One-click **Markdown export** or clipboard copy
- 🔒 100% local — no API keys, no data leaves your machine

---

## Architecture

```
User types transcript
        │
        ▼
Next.js frontend (page.tsx)
        │  POST /api/summarize
        ▼
Next.js API route (app/api/summarize/route.ts)
        │  streams request to localhost:11434
        ▼
Ollama running llama3.1:8b (local)
        │  streams JSON tokens back
        ▼
API route pipes stream to client
        │
        ▼
Frontend accumulates stream → parses JSON → renders cards
        │
        ▼
User exports to Markdown / copies to clipboard
```

---

## Setup

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Ollama](https://ollama.ai) installed and running

### 1. Pull the model

```bash
ollama pull llama3.1:8b
```

This downloads ~4.7GB. Only needed once.

### 2. Start Ollama

```bash
ollama serve
```

Ollama runs on `http://localhost:11434` by default.

### 3. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/meeting-notes-ai
cd meeting-notes-ai
npm install
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

The **frontend** deploys to Vercel normally:

```bash
npx vercel --prod
```

**Important:** Ollama runs locally on your machine — it is not deployed to Vercel. For a live public demo, you have two options:

1. **Record a Loom** with Ollama running locally (recommended for portfolio)
2. **Self-host Ollama** on a VPS (Railway, Fly.io, or a $5 DigitalOcean droplet) and set the `OLLAMA_URL` env variable in Vercel

### Environment variables (optional)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | URL of your Ollama instance |
| `OLLAMA_MODEL` | `llama3.1:8b` | Model to use |

---

## Project Structure

```
meeting-notes-ai/
├── app/
│   ├── api/
│   │   └── summarize/
│   │       └── route.ts       ← Ollama streaming API route
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               ← Main UI
├── lib/
│   ├── types.ts               ← TypeScript interfaces
│   ├── export.ts              ← Markdown export utility
│   └── samples.ts             ← 3 sample transcripts for testing
├── tailwind.config.js
└── README.md
```

---

## Sample Output

Given a sprint planning transcript, MeetingMind produces:

```json
{
  "title": "Sprint Planning — Auth Refactor & Onboarding",
  "summary": "The team agreed to prioritize the auth refactor this sprint...",
  "decisions": [
    { "id": "d1", "text": "Auth refactor ships by Thursday" }
  ],
  "action_items": [
    {
      "id": "a1",
      "task": "Complete auth service refactor",
      "owner": "Marcus + Priya",
      "deadline": "Thursday",
      "priority": "high"
    }
  ],
  "key_points": ["Staging environment monitoring gap identified"],
  "participants": ["Sarah", "Marcus", "Priya", "Jake"],
  "sentiment": "positive"
}
```

---

## What I'd do next

- [ ] **Audio input** — record meetings directly, transcribe with Whisper (also runs via Ollama)
- [ ] **Google Meet / Zoom import** — parse exported .vtt caption files automatically
- [ ] **Persistent history** — save past meeting analyses to localStorage or a local SQLite DB
- [ ] **Slack integration** — post action items directly to a channel
- [ ] **Calendar sync** — create calendar events from action item deadlines

---

## Tech decisions

**Why llama3.1:8b?** Strong instruction-following and summarization quality, fast on CPU, fits in 8GB RAM. `mistral:7b` is a good alternative if you want snappier JSON output.

**Why Next.js App Router?** The streaming API route pattern (`ReadableStream`) makes it very clean to proxy Ollama's SSE stream back to the client without buffering the whole response.

**Why no vector DB?** This is a transcript summarizer, not a RAG system — we send the full transcript in the prompt. For very long meetings (>4000 tokens), you'd want to chunk and summarize in passes.

---