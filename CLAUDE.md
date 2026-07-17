# SREbuddy

Conversational SRE troubleshooting assistant. Users describe an operational
problem (high CPU, memory pressure, etc.), the bot suggests triage steps, the
user reports results, the bot suggests next steps — a multi-turn diagnostic
loop. Inference runs on a local LLM via Ollama.

## Architecture

Three containers behind one published port:

    Browser → nginx:80 (ui) ─┬─ "/"      → static React build
                             └─ "/api/*" → proxy_pass → api:8000 (FastAPI)
                                                          → ollama:11434

Single origin: the browser only ever talks to nginx on port 80. The `api`
container has NO published port — it is reachable only from inside the Docker
network, via nginx. The hostname `api` resolves via Docker DNS, which exists
only container-side.

## HARD CONSTRAINT — relative API paths

The React app MUST call the API with relative paths:

    fetch('/api/query')     ✅
    fetch('/api/sessions')  ✅

NEVER absolute URLs:

    fetch('http://localhost:8000/api/query')  ❌
    fetch('http://api:8000/api/query')        ❌

Why: `fetch()` runs in the browser on the user's machine, not in a container.
`localhost` there means the user's laptop, where nothing listens on 8000 →
connection refused (and if it did listen, a second origin → CORS). `api` is a
Docker-internal DNS name the browser cannot resolve → DNS failure. Either way
the request bypasses nginx entirely. A relative path inherits the page's own
origin (nginx:80), so it reaches nginx by construction.

## Backend API contract

Do not invent endpoints or change these shapes. The backend already exists.

| Method | Path                          | Request body                        | Success response            | Errors |
|--------|-------------------------------|-------------------------------------|-----------------------------|--------|
| POST   | `/api/session`                | —                                   | `{"session_id": "<uuid>"}`  | —      |
| GET | `/api/session?session_id=<id>` | — (query param) | `{"messages": [{"role": "user"|"assistant", "content": str}], "last_activity_ts": float}` | 404 if session missing |
| GET    | `/api/sessions`               | —                                   | `["<id>", "<id>"]`          | —      |
| POST   | `/api/query`                  | `{"session_id": str, "message": str}` | `{"response": str}`       | 404 session missing, 502 LLM upstream failure |

Sessions expire server-side after 30 minutes of inactivity. There is no push
mechanism — no websockets, no SSE. The UI discovers an expired session only on
its next request (a 404 from `/api/query`, or its absence from `/api/sessions`).
Do not build live-update machinery.

## Ownership / scope

Yours:
- `src/ui/` — the React app. Create and modify freely.

Mine — do NOT create or modify:
- `src/api/` — FastAPI backend (complete)
- `images/` — Dockerfiles, nginx config
- `docker-compose.yml`
- `.env`, `.env.example`

If you believe something outside `src/ui/` must change, stop and explain why in
two sentences. Wait for approval.

## Conventions

- Build tool: **Vite**. Build output must be `dist/` (the nginx image copies
  from there).
- Python: read config with `os.environ.get()` only. No python-dotenv.
- Python package manager: `uv`.
- Containerization-first: nothing may assume it runs outside a container.
