import React, { useEffect, useState } from 'react'
import axios from 'axios'
import ReleaseRow from '../components/ReleaseRow'

function statusLabel(status) {
  return status.replace(/_/g, ' ')
}

function QueueCard({ book, onSearchAgain, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isAttention = book.status === 'needs_attention'
  const isActive = ['downloading', 'validating'].includes(book.status)

  async function handleDelete(e) {
    e.stopPropagation()
    if (!window.confirm(`Remove "${book.title}" from the queue?`)) return
    setDeleting(true)
    try {
      await axios.delete(`/api/books/${book.id}`)
      onDelete(book.id)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: `1px solid ${isAttention ? 'var(--warn)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        cursor: 'pointer',
      }} onClick={() => setExpanded(e => !e)}>
        {/* Status indicator */}
        <div style={{ flexShrink: 0 }}>
          {isActive ? (
            <span className="spinner" />
          ) : isAttention ? (
            <span style={{ color: 'var(--warn)', fontSize: 16 }}>⚠</span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>○</span>
          )}
        </div>

        {/* Book info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{book.title}</div>
          {book.author && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{book.author}</div>}
        </div>

        {/* Status + attempt + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span className={`status-pill ${book.status}`}>{statusLabel(book.status)}</span>
          {book.releases?.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Attempt {book.releases.filter(r => r.status === 'downloading').length +
                       book.releases.filter(r => ['passed','flagged_drm','flagged_corrupt','flagged_size','flagged_encoding','deleted'].includes(r.status)).length} / {book.releases.length}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            disabled={deleting}
            title="Remove from queue"
            style={{ color: 'var(--error)', borderColor: 'transparent', padding: '2px 8px' }}
          >
            {deleting ? <span className="spinner" /> : '✕'}
          </button>
        </div>
      </div>

      {/* needs_attention actions */}
      {isAttention && (
        <div style={{
          padding: '0 16px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: 'var(--warn)', flex: 1 }}>
            All releases exhausted — manual search required.
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => onSearchAgain(book)}>
            Search again
          </button>
        </div>
      )}

      {/* Expanded release history */}
      {expanded && book.releases?.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Release attempts
          </div>
          {book.releases.map(r => <ReleaseRow key={r.id} release={r} />)}
        </div>
      )}
    </div>
  )
}

export default function Queue() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const { data } = await axios.get('/api/queue')
      setBooks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  function handleSearchAgain(book) {
    window.location.href = `/search?q=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author || '')}`
  }

  function handleDelete(bookId) {
    setBooks(prev => prev.filter(b => b.id !== bookId))
  }

  if (loading) return <div className="empty-state"><span className="spinner" /></div>

  return (
    <div>
      <h1 className="page-title">Queue</h1>
      {books.length === 0 ? (
        <div className="empty-state">No active downloads. Search for a book to get started.</div>
      ) : (
        books.map(book => (
          <QueueCard key={book.id} book={book} onSearchAgain={handleSearchAgain} onDelete={handleDelete} />
        ))
      )}
    </div>
  )
}
