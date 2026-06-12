import React from 'react'

export default function ScoreBadge({ score }) {
  let bg, color
  if (score > 100) {
    bg = 'rgba(74,222,128,0.15)'; color = 'var(--success)'
  } else if (score >= 50) {
    bg = 'rgba(251,191,36,0.15)'; color = '#fbbf24'
  } else {
    bg = 'rgba(248,113,113,0.15)'; color = 'var(--error)'
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 'var(--radius)',
      background: bg,
      color,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
    }}>
      {score}
    </span>
  )
}
