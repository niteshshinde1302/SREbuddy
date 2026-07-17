// Assistant-side "thinking" bubble. Animation is pure CSS @keyframes
// (see .typing__dot in styles.css) — no JS timers.
export default function TypingIndicator() {
  return (
    <div className="typing" aria-label="Assistant is typing">
      <span className="typing__dot" />
      <span className="typing__dot" />
      <span className="typing__dot" />
    </div>
  )
}
