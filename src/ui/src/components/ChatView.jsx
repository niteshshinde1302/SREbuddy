import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import { ApiError, getSession, postQuery } from '../api/client.js'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'

const DEAD_MSG =
  'This chat has ended due to inactivity for more than 30mins, please start a new chat'
const BUSY_MSG = 'LLM is busy try again later.'
const GENERIC_MSG = 'Something went wrong, please try again.'

export default function ChatView() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { refreshSessions } = useOutletContext()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [dead, setDead] = useState(false) // session ended -> input disabled
  const [error, setError] = useState(null) // transient inline error (502/generic)

  const scrollRef = useRef(null)

  // Load the conversation whenever the routed session id changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDead(false)
    setError(null)
    setMessages([])

    getSession(sessionId)
      .then((data) => {
        if (cancelled) return
        setMessages(Array.isArray(data.messages) ? data.messages : [])
        setLoading(false)
      })
      .catch(async (err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          // Dead session: drop it from the sidebar (event-driven, one-shot),
          // then fall back to the "select a conversation" home view.
          await refreshSessions()
          if (!cancelled) navigate('/')
          return
        }
        // Any other failure: show an inline error, stay on the page.
        setError(GENERIC_MSG)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId, refreshSessions, navigate])

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  async function handleSend(text) {
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const response = await postQuery(sessionId, text)
      setMessages((prev) => [...prev, { role: 'assistant', content: response }])
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Session expired mid-chat: keep chat open, show notice, lock input.
        // Do NOT refresh the sidebar — dead session lingers until next refresh.
        setMessages((prev) => [...prev, { role: 'system', content: DEAD_MSG }])
        setDead(true)
      } else {
        // 502 and default both remove the optimistic user bubble to stay in
        // sync with the server (which discards the user message on failure).
        setMessages((prev) => prev.slice(0, -1))
        setError(
          err instanceof ApiError && err.status === 502 ? BUSY_MSG : GENERIC_MSG,
        )
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat">
      <div className="messages" ref={scrollRef}>
        {!loading && messages.length === 0 && !error && (
          <div className="messages__empty">
            Describe an operational problem to get started.
          </div>
        )}
        <MessageList messages={messages} sending={sending} />
        {error && <div className="error-banner">{error}</div>}
      </div>
      <MessageInput onSend={handleSend} disabled={sending || dead} />
    </div>
  )
}
