# 📬 Email Sentiment Analyzer

> Paste any email thread → get tone analysis, intent detection, risk level, and 3 ready-to-send reply drafts.

---

## What It Does

- **Sentiment detection** — classifies the email as frustrated, positive, confused, urgent, or neutral
- **Confidence score** — a 0–100 score shown as a visual arc gauge
- **Key signals** — extracts specific phrases/patterns that drove the classification
- **Intent analysis** — infers what the sender actually wants to achieve
- **Risk level** — low / medium / high flag so you know how fast to act
- **Response urgency** — recommends a reply window (1 hr / 4 hr / 24 hr / 48 hr)
- **3 reply drafts** — formal, friendly, and brief variants, copy with one click

---

## Tech Stack

| Layer       | Tool                                      |
|-------------|-------------------------------------------|
| Frontend    | React (Next.js) + Tailwind via inline CSS |
| Deployment  | Vercel                                    |
| LLM         | Ollama (`mistral:7b` locally) **or** Claude API |
| Typography  | Playfair Display + DM Sans + DM Mono      |


---

## Local Setup (Ollama)

```bash
# 1. Install Ollama
# https://ollama.com/download

# 2. Start the server
ollama serve

# 3. Pull the recommended model
ollama pull mistral:7b

# 4. Install and run the Next.js app
npm install
npm run dev
```

The app will call `http://localhost:11434/api/generate` by default.  
You can change the URL and model in the ⚙ Config panel inside the app.

---

## Using Claude API Instead

Switch to Claude API mode in the config panel. The app calls `/v1/messages` with `claude-sonnet-4-20250514`.

You'll need an Anthropic API key. For Next.js, add to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then move the API call to a Next.js API route (`/api/analyze`) to keep the key server-side.

---

## Project Structure

```
/
├── app/
│   ├── page.tsx          # Main page
│   └── api/
│       └── analyze/
│           └── route.ts  # Server-side Ollama/Claude call
├── components/
│   └── EmailAnalyzer.tsx # Main UI component
└── README.md
```

---

## Edge Cases Handled

- Multi-sender threads (mixed sentiment across participants)
- Very short emails (< 3 lines) → lower confidence score
- Ambiguous tone → secondary sentiments listed alongside primary
- No clear action item → intent field flags "unclear"

---

## What I Learned

- `mistral:7b` is fast and reliable for tone classification — response in ~2–4s locally
- Structured JSON output via Ollama's `format: "json"` flag is a game-changer
- The "brief" reply variant is consistently the most useful in testing
- Confidence scoring made the output feel much more trustworthy vs. a raw label

---
