import TypingIndicator from './TypingIndicator.jsx'

// Rounded message bubbles. User right-aligned, assistant left-aligned, and a
// centered "system" style for the dead-session notice. The typing indicator
// appears on the assistant side while a response is pending.
export default function MessageList({ messages, sending }) {
  return (
    <>
      {messages.map((m, i) => (
        <div key={i} className={`bubble bubble--${bubbleKind(m.role)}`}>
          {m.content}
        </div>
      ))}
      {sending && <TypingIndicator />}
    </>
  )
}

function bubbleKind(role) {
  if (role === 'user') return 'user'
  if (role === 'system') return 'system'
  return 'assistant'
}
