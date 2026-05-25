# ⚖️ ContractIQ — Contract Summarizer & Risk Scorer

> Paste any contract → get clause-by-clause risk breakdown + plain-English summary

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-1.35+-red)
![Ollama](https://img.shields.io/badge/Ollama-mistral:7b-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Upload a PDF contract (NDA, freelance agreement, SaaS terms) or paste the text directly.
ContractIQ uses a local Ollama model to:

1. **Extract every major clause** (indemnity, liability, IP, termination, payment, etc.)
2. **Score each clause 1–10** for risk (1 = fair, 10 = extremely one-sided)
3. **Plain-English explanation** of what each clause actually means
4. **Flag specific concerns** (e.g. "unlimited indemnity", "no IP cap")
5. **Overall risk score** + key concerns summary
6. **Export** the full report as a `.txt` file

> ⚠️ Not legal advice. For portfolio / educational use only.

---

## Stack

| Layer | Tech |
|-------|------|
| UI | Streamlit |
| LLM | Ollama → mistral:7b |
| PDF parsing | PyMuPDF (fitz) |
| Output format | JSON (via Ollama `format="json"`) |

---

## Setup

### 1. Install Ollama & pull the model

```bash
# Install Ollama from https://ollama.ai
ollama pull mistral:7b
```

### 2. Clone & install Python deps

```bash
pip install streamlit pymupdf ollama
```

### 3. Run

```bash
# Terminal 1: make sure Ollama is running
ollama serve

# Terminal 2: launch the app
streamlit run app.py
```

Open http://localhost:8501

---

## Project structure

```
contractiq/
├── app.py          # Main Streamlit app
├── README.md
└── sample_contracts/
    ├── nda_example.txt
    ├── freelance_example.txt
    └── saas_terms_example.txt
```

---

## Risk rubric

| Score | Level | Meaning |
|-------|-------|---------|
| 1–3 | 🟢 Low | Standard, balanced clause |
| 4–6 | 🟡 Medium | Unusual but common in the industry |
| 7–10 | 🔴 High | One-sided, aggressive, or potentially harmful |

**Categories analyzed:**
- `indemnity` — who owes what if something goes wrong
- `liability` — caps or exclusions on damages
- `termination` — notice periods and for-cause vs at-will
- `ip` — who owns the work product
- `exclusivity` — non-compete / non-solicitation
- `payment` — payment terms and disputes
- `governing_law` — jurisdiction and arbitration
- `other` — any other notable clause

---

## Demo

Three sample contracts are built into the app (load from sidebar expander):
- NDA with aggressive indemnification
- Freelance agreement with IP assignment issues
- SaaS terms with auto-renewal trap

---

## Key prompt design

The extraction prompt forces `format="json"` in the Ollama API call so the model
always returns structured data. Temperature is set to `0.1` for consistency.

```python
response = ollama.chat(
    model="mistral:7b",
    messages=[...],
    format="json",
    options={"temperature": 0.1},
)
```

---

## Limitations

- Context window truncated to ~12k chars for long contracts
- Model accuracy varies — always review with a real lawyer for actual contracts
- Ollama runs locally, so deployment needs a server with Ollama installed

---

