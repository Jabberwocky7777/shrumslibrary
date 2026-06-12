import React, { useState } from 'react'
import axios from 'axios'

export default function BookCard({ book, kindleAddresses, onRefresh }) {
  const [sendingTo, setSendingTo] = useState('')
  const [sending, setSending] = useState(false)
  const [fixing, setFixing] = useState(false)

  const defaultAddr = kindleAddresses?.find(a => a.is_default) || kindleAddresses?.[0]

  async function sendToKindle(kindleId) {
    setSending(true)
    try {
      const url = kindleId
        ? `/api/books/${book.id}/send/${kindleId}`
        : `/api/books/${book.id}/send`
      await axios.post(url)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setSending(false)
    }
  }

  async function fixEncoding() {
    setFixing(true)
    try {
      await axios.post(`/api/books/${book.id}/fix-encoding`)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Cover */}
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={book.title}
          style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius)', background: 'var(--bg-deep)' }}
        />
      ) : (
        <div style={{
          width: '100%', height: 160,
          background: 'var(--bg-deep)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-dim)', fontSize: 32,
        }}>
          📖
        </div>
      )}

      {/* Info */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, marginBottom: 2 }}>{book.title}</div>
        {book.author && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{book.author}</div>}
        {book.year && <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{book.year}</div>}
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className={`status-pill ${book.status}`}>{book.status.replace('_', ' ')}</span>
        {book.validation?.encoding_issues ? (
          <span className="badge" style={{ background: 'rgba(251,146,60,0.15)', color: 'var(--warn)', fontSize: 10 }}>
            Encoding warning
          </span>
        ) : null}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {book.validation?.encoding_issues && book.file_path && (
          <button className="btn btn-ghost btn-sm" onClick={fixEncoding} disabled={fixing}>
            {fixing ? 'Fixing…' : 'Fix encoding'}
          </button>
        )}

        {(book.status === 'imported' || book.status === 'sent' || book.status === 'failed') && book.file_path && (
          <div style={{ display: 'flex', gap: 6 }}>
            {kindleAddresses?.length > 1 && (
              <select
                value={sendingTo}
                onChange={e => setSendingTo(e.target.value)}
                style={{ flex: 1, fontSize: 12 }}
              >
                <option value="">Default Kindle</option>
                {kindleAddresses.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => sendToKindle(sendingTo || undefined)}
              disabled={sending}
              style={{ flexShrink: 0 }}
            >
              {sending ? '…' : book.status === 'sent' ? 'Resend' : 'Send to Kindle'}
            </button>
          </div>
        )}

        {book.status === 'sent' && book.kindle_sent_at && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Sent {new Date(book.kindle_sent_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  )
}
