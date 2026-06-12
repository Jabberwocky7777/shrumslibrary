import React, { useState } from 'react'
import axios from 'axios'

export default function TestButton({ endpoint, payload, label = 'Test Connection' }) {
  const [state, setState] = useState('idle') // idle | loading | ok | fail
  const [message, setMessage] = useState('')

  async function runTest() {
    setState('loading')
    setMessage('')
    try {
      const { data } = await axios.post(endpoint, payload || {})
      setState(data.ok ? 'ok' : 'fail')
      setMessage(data.message || '')
    } catch (err) {
      setState('fail')
      setMessage(err.response?.data?.message || err.message)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={runTest}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? <span className="spinner" /> : null}
        {label}
      </button>

      {state === 'ok' && (
        <span style={{ color: 'var(--success)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          ✓ {message}
        </span>
      )}
      {state === 'fail' && (
        <span style={{ color: 'var(--error)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          ✗ {message}
        </span>
      )}
    </div>
  )
}
