import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import TopBar from './components/TopBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import { createSession, getSessions } from './api/client.js'

// App owns the shared `sessions` list. It is fetched once on mount and
// re-fetched ONLY on explicit user action (Refresh button, New Chat) or when a
// ChatView reports a dead session (404). No polling / no interval.
const BACKEND_ERROR = "Couldn't reach the backend."

export default function App() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Side-effecting only: updates the shared list (and error banner). Returns
  // nothing — callers await it purely for sequencing.
  const refreshSessions = useCallback(async () => {
    try {
      const ids = await getSessions()
      setSessions(Array.isArray(ids) ? ids : [])
      setError(null)
    } catch {
      setError(BACKEND_ERROR)
    }
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const handleNewChat = useCallback(async () => {
    try {
      const id = await createSession()
      setError(null)
      await refreshSessions()
      navigate(`/chat/${id}`)
    } catch {
      // Creation failed — nothing to navigate to; list is unchanged.
      setError(BACKEND_ERROR)
    }
  }, [refreshSessions, navigate])

  return (
    <div className="app">
      <TopBar onNewChat={handleNewChat} />
      {error && <div className="app__error">{error}</div>}
      <div className="body">
        <Sidebar sessions={sessions} onRefresh={refreshSessions} />
        <main className="pane">
          <Outlet context={{ refreshSessions }} />
        </main>
      </div>
    </div>
  )
}
