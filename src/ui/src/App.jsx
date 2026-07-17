import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import TopBar from './components/TopBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import { createSession, getSessions } from './api/client.js'

// App owns the shared `sessions` list. It is fetched once on mount and
// re-fetched ONLY on explicit user action (Refresh button, New Chat) or when a
// ChatView reports a dead session (404). No polling / no interval.
export default function App() {
  const [sessions, setSessions] = useState([])
  const navigate = useNavigate()

  const refreshSessions = useCallback(async () => {
    try {
      const ids = await getSessions()
      setSessions(Array.isArray(ids) ? ids : [])
      return ids
    } catch {
      // Non-fatal: leave the current list in place if the refresh fails.
      return null
    }
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const handleNewChat = useCallback(async () => {
    try {
      const id = await createSession()
      await refreshSessions()
      navigate(`/chat/${id}`)
    } catch {
      // Creation failed — nothing to navigate to; list is unchanged.
    }
  }, [refreshSessions, navigate])

  return (
    <div className="app">
      <TopBar onNewChat={handleNewChat} />
      <div className="body">
        <Sidebar sessions={sessions} onRefresh={refreshSessions} />
        <main className="pane">
          <Outlet context={{ refreshSessions }} />
        </main>
      </div>
    </div>
  )
}
