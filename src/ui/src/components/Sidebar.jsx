import { NavLink } from 'react-router-dom'

// Show a friendly, stable label for a session (only the UUID is available).
function label(id) {
  return `Session ${id.slice(0, 8)}`
}

// Left sidebar: list of active sessions + a manual Refresh.
// When there are zero sessions, a watermark invites starting a new one.
export default function Sidebar({ sessions, onRefresh }) {
  const isEmpty = sessions.length === 0

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Conversations</span>
        <button className="btn btn--ghost" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <ul className="sidebar__list">
        {isEmpty && (
          <div className="sidebar__watermark">Start a new conversation</div>
        )}
        {sessions.map((id) => (
          <li key={id}>
            <NavLink
              to={`/chat/${id}`}
              className={({ isActive }) =>
                isActive ? 'session-link active' : 'session-link'
              }
              title={id}
            >
              {label(id)}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  )
}
