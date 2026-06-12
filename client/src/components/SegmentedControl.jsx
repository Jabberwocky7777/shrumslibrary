import React from 'react'

export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '7px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: value === opt.value ? 'var(--accent)' : 'var(--bg-raised)',
            color: value === opt.value ? '#fff' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
