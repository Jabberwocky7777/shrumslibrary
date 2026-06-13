import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function BookCard({ book }) {
  const [adding, setAdding]   = useState(false)
  const [added, setAdded]     = useState(false)
  const [error, setError]     = useState('')

  async function handleAdd() {
    setAdding(true)
    setError('')
    try {
      await axios.post('/api/request', { title: book.title, author: book.author, series: book.series })
      setAdded(true)
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Already in queue')
      } else {
        setError(err.response?.data?.error || 'Failed to add')
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      {/* Cover */}
      <div style={{ flexShrink: 0, width: 42, height: 60 }}>
        {book.cover_id ? (
          <img
            src={`https://covers.openlibrary.org/b/id/${book.cover_id}-S.jpg`}
            alt=""
            style={{ width: 42, height: 60, objectFit: 'cover', borderRadius: 2, display: 'block' }}
          />
        ) : (
          <div style={{
            width: 42, height: 60, background: 'var(--bg-raised)',
            borderRadius: 2, border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            📖
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 13,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {book.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {[book.author, book.year].filter(Boolean).join(' · ')}
        </div>
        {book.series && (
          <div style={{
            fontSize: 11, color: 'var(--accent)', marginTop: 3,
            fontFamily: 'var(--font-mono)',
          }}>
            {book.series}
          </div>
        )}
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        {error && (
          <span style={{
            fontSize: 11,
            color: error === 'Already in queue' ? 'var(--text-muted)' : 'var(--error)',
          }}>
            {error}
          </span>
        )}
        {added ? (
          <Link
            to="/queue"
            style={{
              fontSize: 12, color: 'var(--success)',
              textDecoration: 'none', fontFamily: 'var(--font-mono)',
            }}
          >
            ✓ In Queue →
          </Link>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? <span className="spinner" /> : 'Add to Queue'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Search() {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [controller, setController] = useState(null)
  const [error, setError]         = useState('')
  const [searched, setSearched]   = useState(false)

  function handleQueryChange(e) {
    setQuery(e.target.value)
    setResults([])
    setSearched(false)
    setError('')
  }

  function handleCancel() {
    if (controller) {
      controller.abort()
      setController(null)
      setSearching(false)
    }
  }

  async function handleSearch(e) {
    e?.preventDefault()
    if (!query.trim() || searching) return
    const ctrl = new AbortController()
    setController(ctrl)
    setSearching(true)
    setError('')
    setResults([])
    setSearched(false)
    try {
      const { data } = await axios.get('/api/lookup', {
        params: { q: query },
        signal: ctrl.signal,
      })
      setResults(data)
      setSearched(true)
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError') {
        // user cancelled
      } else {
        setError(err.response?.data?.error || 'Search failed')
      }
    } finally {
      setController(null)
      setSearching(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Search</h1>

      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'flex-end' }}
      >
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Title or Series</label>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="e.g. Dungeon Crawler Carl"
            autoFocus
          />
        </div>
        <button
          type={searching ? 'button' : 'submit'}
          className="btn btn-primary"
          onClick={searching ? handleCancel : undefined}
          disabled={!searching && !query.trim()}
          style={{ flexShrink: 0 }}
        >
          {searching ? 'Cancel' : 'Search'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--error)', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {searching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="spinner" />
          Searching Open Library…
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div style={{
            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
          }}>
            {results.length} books found
          </div>
          {results.map(book => (
            <BookCard key={book.key} book={book} />
          ))}
        </div>
      )}

      {searched && results.length === 0 && !searching && (
        <div className="empty-state">No books found for "{query}".</div>
      )}
    </div>
  )
}
