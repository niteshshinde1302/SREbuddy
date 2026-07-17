// API client for the SREbuddy backend.
//
// HARD CONSTRAINT (CLAUDE.md): every request uses a RELATIVE path (/api/...).
// The browser talks only to its own origin (nginx), which proxies /api/* to the
// api container. Never use absolute URLs here.

// Error carrying the HTTP status so call sites can branch on 404 vs 502.
// Note: network-level fetch() rejections do NOT produce an ApiError — they
// surface as a plain Error with no .status, and must be treated as the default
// error branch by every caller.
export class ApiError extends Error {
  constructor(status, message) {
    super(message || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

// POST /api/session -> { session_id }
export async function createSession() {
  const res = await fetch('/api/session', { method: 'POST' })
  if (!res.ok) throw new ApiError(res.status)
  const data = await parseJson(res)
  return data.session_id
}

// GET /api/sessions -> ["<id>", ...]
export async function getSessions() {
  const res = await fetch('/api/sessions')
  if (!res.ok) throw new ApiError(res.status)
  return await parseJson(res)
}

// GET /api/session?session_id=<id> -> { messages, last_activity_ts }
// Throws ApiError(404) when the session is missing/expired.
export async function getSession(id) {
  const res = await fetch(`/api/session?session_id=${encodeURIComponent(id)}`)
  if (!res.ok) throw new ApiError(res.status)
  return await parseJson(res)
}

// POST /api/query -> { response }
// Throws ApiError with .status 404 (session gone) or 502 (LLM upstream).
export async function postQuery(id, message) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: id, message }),
  })
  if (!res.ok) throw new ApiError(res.status)
  const data = await parseJson(res)
  return data.response
}
