import React from 'react'
import ScoreBadge from './ScoreBadge'

const STATUS_ICONS = {
  pending:         { icon: '○', color: 'var(--text-muted)' },
  downloading:     { icon: '⬇', color: '#fbbf24' },
  validating:      { icon: '🔍', color: '#fbbf24' },
  passed:          { icon: '✓', color: 'var(--success)' },
  flagged_drm:     { icon: '🔒', color: 'var(--error)' },
  flagged_encoding:{ icon: '⚠', color: 'var(--warn)' },
  flagged_corrupt: { icon: '✗', color: 'var(--error)' },
  flagged_size:    { icon: '⚠', color: 'var(--warn)' },
  deleted:         { icon: '✗', color: 'var(--text-dim)' },
}

export default function ReleaseRow({ release }) {
  const s = STATUS_ICONS[release.status] || { icon: '?', color: 'var(--text-muted)' }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '8px 12px',
      background: 'var(--bg-deep)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      marginBottom: 4,
    }}>
      <span style={{ color: s.color, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'var(--text)',
          marginBottom: 2,
        }}>
          {release.nzb_title}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {release.release_group && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {release.release_group}
            </span>
          )}
          {release.file_size_mb > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {release.file_size_mb.toFixed(1)} MB
            </span>
          )}
          <ScoreBadge score={release.score} />
          {release.flag_reason && (
            <span style={{ fontSize: 11, color: s.color }}>{release.flag_reason}</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, paddingTop: 2 }}>
        #{release.attempt_number}
      </span>
    </div>
  )
}
