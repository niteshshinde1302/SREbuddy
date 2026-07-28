# SREbuddy

A containerized conversational SRE troubleshooting assistant. A user describes an
operational problem — high CPU, memory pressure, a failing service — and the bot
suggests triage steps in a multi-turn diagnostic loop: it proposes commands, the
user reports results, and it narrows toward a root cause. Inference runs entirely
on a local LLM via [Ollama](https://ollama.com/) (`qwen2.5:3b`); there is no
external API and no data leaves the host.

## Architecture

Three containers behind a single published port:

```
Browser → nginx:80 (ui) ─┬─ "/"      → static React build
                         └─ "/api/*" → proxy_pass → api:8000 (FastAPI)
                                                      → ollama:11434
```

The design is a single-origin reverse proxy. The browser only ever talks to
nginx on the published port. The `api` container has **no published port** — it
is reachable only from inside the Docker network, via nginx, whose
`/api/` location `proxy_pass`es to `http://api:8000`. Because the React app
issues only **relative** `/api/...` requests, every call inherits the page's own
origin (nginx), so requests reach the backend by construction and there is **no
CORS** — there is only one origin.

Ollama starts with no model weights, so an `ollama-pull` sidecar bootstraps the
stack: it waits for `ollama` to become healthy, pulls `${MODEL_NAME}`, then
exits. The `api` service depends on that sidecar via
`condition: service_completed_successfully`, so it does not start serving until
the model is present. This makes `docker compose up` self-contained — a clean
machine reaches a working stack with one command, no manual pull step.

Sessions are held in memory in the `api` process and expire after 30 minutes of
inactivity. There is no push channel (no websockets/SSE); the UI discovers an
expired session on its next request. nginx sets `proxy_read_timeout 600s` on the
`/api/` location so a slow local generation is not cut off mid-response.

## Tech stack

- **Frontend:** React 18, Vite, React Router, plain CSS
- **Edge / static serving:** nginx (reverse proxy + SPA fallback)
- **Backend:** FastAPI, Uvicorn, Pydantic, the `ollama` Python client
- **LLM runtime:** Ollama running `qwen2.5:3b`, fully local
- **Packaging:** Docker + Docker Compose, multi-stage builds (`node`→`nginx`,
  `uv`→`python-slim`)
- **Session store:** in-process, in-memory (30-minute inactivity expiry)

## Getting started

### Prerequisites

- Docker Desktop (Compose v2)

### Configure

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

| Variable          | Purpose                                              | Example                  |
|-------------------|------------------------------------------------------|--------------------------|
| `OLLAMA_BASE_URL` | Ollama endpoint the `api` uses for inference         | `http://ollama:11434`    |
| `OLLAMA_HOST`     | Ollama endpoint the `ollama-pull` sidecar pulls from | `http://ollama:11434`    |
| `MODEL_NAME`      | Model tag Ollama pulls and serves                    | `qwen2.5:3b`             |
| `UI_PORT`         | Host port that maps to nginx (port 80 in-container)  | `8501`                   |

### Run

```bash
docker compose up --build
```

The first run downloads the model weights (**~2 GB** for `qwen2.5:3b`), which
Ollama caches in a named volume, so subsequent starts are fast. Once the `api`
container reports healthy, open:

```
http://localhost:${UI_PORT}      # e.g. http://localhost:8501
```

## Backend API contract

| Method | Path                             | Request body                          | Success response                                                                          | Errors                                    |
|--------|----------------------------------|---------------------------------------|-------------------------------------------------------------------------------------------|-------------------------------------------|
| POST   | `/api/session`                   | —                                     | `{"session_id": "<uuid>"}`                                                                 | —                                         |
| GET    | `/api/session?session_id=<id>`   | — (query param)                       | `{"messages": [{"role": "user"\|"assistant", "content": str}], "last_activity_ts": float}` | 404 if session missing                    |
| GET    | `/api/sessions`                  | —                                     | `["<id>", "<id>"]`                                                                         | —                                         |
| POST   | `/api/query`                     | `{"session_id": str, "message": str}` | `{"response": str}`                                                                        | 404 session missing, 502 LLM upstream fail |

## Project structure

```
.
├── docker-compose.yml            # 4 services: ollama, ollama-pull, api, ui
├── .env.example
├── images/
│   ├── api/
│   │   ├── Dockerfile            # uv → python-slim, multi-stage
│   │   └── pyproject.toml
│   └── ui/
│       ├── Dockerfile            # node build → nginx, multi-stage
│       └── default.conf          # nginx: SPA serving + /api reverse proxy
├── src/
│   ├── api/                      # FastAPI backend
│   │   ├── main.py               # endpoints, in-memory sessions, expiry sweep
│   │   └── prompts.py            # SRE system prompt + message assembly
│   └── ui/                       # React SPA (Vite)
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── main.jsx          # router
│           ├── App.jsx           # layout + shared session state
│           ├── api/client.js     # relative /api fetch wrappers
│           └── components/       # TopBar, Sidebar, ChatView, ...
└── CLAUDE.md                     # architecture + scope contract
```

## Roadmap

- **CI/CD** — GitLab pipeline to build and publish both images.
- **AWS ECS** — deploy the stack, first by hand, then codified in Terraform.
- **Redis session store** — move sessions out of process so `api` can restart or
  scale horizontally without losing conversations.
- **Streaming responses** — stream tokens to the UI as they generate. This
  removes the current nginx `proxy_read_timeout` workaround, since a streamed
  connection produces bytes continuously rather than blocking on one long
  response.
- **Kubernetes** — migrate the orchestration to k8s once the above are in place.

## How this was built

I designed the architecture and own all of the infrastructure: the nginx
reverse-proxy configuration, every Dockerfile, and the Docker Compose
orchestration — including the `ollama-pull` model-bootstrap sidecar and the
healthcheck-based dependency ordering (`service_healthy` /
`service_completed_successfully`) that makes `docker compose up` self-contained.
The FastAPI backend under `src/api/` is mine as well.

The React frontend under `src/ui/` was scaffolded by an AI coding assistant
working inside a strict scope fence defined in `CLAUDE.md`. It was confined to
`src/ui/`, forbidden from touching any infrastructure, and its output was
reviewed against a hard constraint — **relative `/api/` paths only** — before
merge, because an absolute URL would bypass nginx and break the single-origin
model.

This split was deliberate. React was chosen over a batteries-included option
like Streamlit precisely to force the real infrastructure concerns into the
open — origins, ports, reverse proxying, CORS, container-to-container DNS — which
is where the engineering interest of this project lives. The frontend internals
were delegated so that attention stayed on the infrastructure rather than on
component plumbing.
