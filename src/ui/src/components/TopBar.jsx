// Top bar: brand on the left, "New Chat" on the right.
export default function TopBar({ onNewChat }) {
  return (
    <header className="topbar">
      <span className="topbar__brand">SREbuddy</span>
      <button className="btn" onClick={onNewChat}>
        New Chat
      </button>
    </header>
  )
}
