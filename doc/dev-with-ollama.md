# Local Development with Ollama

Use Ollama to run AI locally during development — no API rate limits, no costs.

## Prerequisites

- [Ollama](https://ollama.com) installed (`brew install ollama` or download from site)
- A model pulled: `ollama pull gemma3:4b` (3.3 GB, runs on 8GB+ RAM)

## Start Ollama

```bash
ollama serve
```

Or just open the Ollama desktop app — it starts the server automatically on `http://localhost:11434`.

## Switch Backend to Ollama

In `server/.env`, set:

```env
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
```

Restart the backend (env changes require a restart):

```bash
cd server
npm run dev
```

## Switch Back to Cloud Providers

Remove or comment out the override in `server/.env`:

```env
# AI_PROVIDER=ollama
```

The backend will revert to the tier-based strategy:
- **free** → Gemini Flash
- **pro/premium** → Claude Sonnet

Restart the backend after changing.

## Other Models

Any Ollama model works. Larger models give better results but are slower:

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| `gemma3:4b` | 3.3 GB | Fast | Good for dev |
| `llama3.1:8b` | 4.7 GB | Medium | Better |
| `mistral` | 4.1 GB | Medium | Better |
| `llama3.1:70b` | 40 GB | Slow | Near cloud quality |

Pull a different model:

```bash
ollama pull llama3.1:8b
```

Then update `OLLAMA_MODEL` in `server/.env`.

## Notes

- First request after model load takes a few seconds (model warming up)
- Subsequent requests are fast (~2-5s for 4B models)
- Ollama auto-unloads models after 5 min idle to free RAM
- JSON output quality varies by model — `gemma3:4b` handles structured JSON well
