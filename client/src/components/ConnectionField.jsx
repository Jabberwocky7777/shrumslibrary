import React, { useState } from 'react'

export default function ConnectionField({ label, value, onChange, placeholder, hint }) {
  const [revealed, setRevealed] = useState(false)

  const displayValue = revealed ? value : (value ? '••••••' : '')

  function handleChange(e) {
    onChange(e.target.value)
  }

  function handleFocus() {
    // Clear the masked placeholder so user can type a new value
    if (!revealed && value) {
      onChange('')
    }
    setRevealed(true)
  }

  function handleBlur() {
    setRevealed(false)
  }

  async function copyToClipboard() {
    if (value && value !== '••••••') {
      await navigator.clipboard.writeText(value)
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setRevealed(r => !r)}
          title={revealed ? 'Hide' : 'Reveal'}
          style={{ flexShrink: 0, padding: '6px 10px' }}
        >
          {revealed ? '🙈' : '👁'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={copyToClipboard}
          title="Copy to clipboard"
          style={{ flexShrink: 0, padding: '6px 10px' }}
        >
          📋
        </button>
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}
