import { useState } from 'react'

// Composer: Enter sends, Shift+Enter inserts a newline. Disabled while a
// response is pending or the session has ended.
export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer">
      <textarea
        className="composer__input"
        rows={1}
        placeholder={
          disabled ? 'Input disabled' : 'Describe your operational problem…'
        }
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button className="btn" onClick={submit} disabled={disabled}>
        Send
      </button>
    </div>
  )
}
