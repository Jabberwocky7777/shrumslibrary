import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import ScoreBadge from '../components/ScoreBadge'

function formatAge(days) {
  if (days == null) return '—'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

function FormatBadge({ format }) {
  if (!format) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
  const styles = {
    EPUB: { bg: 'rgba(74,222,128,0.12)', color: 'var(--success)' },
    MOBI: { bg: 'rgba(129,140,248,0.12)', color: 'var(--accent)' },
    AZW:  { bg: 'rgba(129,140,248,0.12)', color: 'var(--accent)' },
    PDF:  { bg: 'rgba(251,146,60,0.12)',  color: 'var(--warn)' },
  }
  const s = styles[format] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      fontFamily: 'var(--font-mono)', padding: '2px 6px',
      borderRadius: 3, background: s.bg, color: s.color,
    }}>{format}</span>
  )
}

export default function Search() {
  const [query, setQuery]       = useState('')
  const [author, setAuthor]     = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding]     = useState(false)
  const [forcingIdx, setForcingIdx] = useState(null)
  const [error, setError]       = useState('')
  const [added, setAdded]       = useState(null)

  function resetForNewQuery() {
    setResults([])
    setAdded(null)
    setError('')
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setAdded(null)
    try {
      const { data } = await axios.get('/api/search', { params: { q: query, author } })
      setResults(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function doAdd(payload) {
    try {
      const { data } = await axios.post('/api/request', payload)
      setAdded(data)
      return true
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This book is already in your queue.')
      } else {
        setError(err.response?.data?.error || 'Failed to add to queue')
      }
      return false
    }
  }

  async function handleAddToQueue(e) {
    e.preventDefault()
    if (!query.trim() || adding) return
    setAdding(true)
    setError('')
    // Pass already-loaded results so the backend skips a redundant search
    await doAdd({ title: query, author, allResults: results.length > 0 ? results : undefined })
    setAdding(false)
  }

  async function handleForce(release, idx) {
    setForcingIdx(idx)
    setError('')
    await doAdd({
      title: query,
      author,
      nzb_title: release.nzb_title,
      release_group: release.release_group,
      file_size_mb: release.file_size_mb,
      score: release.score,
      nzb_url: release.nzb_url,
      allResults: results,
    })
    setForcingIdx(null)
  }

  const busy = searching || adding || forcingIdx !== null

  return (
    <div>
      <h1 className="page-title">Search</h1>

      <form style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 2, marginBottom: 0 }}>
          <label>Title</label>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); resetForNewQuery() }}
            placeholder="e.g. Project Hail Mary"
            onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Author</label>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="e.g. Andy Weir"
            onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleSearch}
          disabled={busy || !query.trim()}
          style={{ flexShrink: 0 }}
        >
          {searching ? <span className="spinner" /> : 'Search'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAddToQueue}
          disabled={busy || !query.trim() || !!added}
          style={{ flexShrink: 0 }}
        >
          {adding ? <span className="spinner" /> : added ? '✓ Added' : 'Add to Queue'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--error)', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {added && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          padding: '10px 14px', borderRadius: 'var(--radius)',
          background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
          fontSize: 13, color: 'var(--success)',
        }}>
          <span>✓</span>
          <span><strong>{added.title}</strong> added to queue</span>
          <Link to="/queue" style={{ marginLeft: 'auto', fontSize: 12 }}>View Queue →</Link>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            {results.length} results — sorted by score
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Release', 'Format', 'Group', 'Size', 'Age', 'Score', ''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '6px 10px',
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: 'var(--text-muted)', fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i === 0 ? 'rgba(129,140,248,0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '9px 10px', maxWidth: 380 }}>
                    <div style={{
                      fontSize: 12, fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {i === 0 && <span style={{ color: 'var(--accent)', marginRight: 6, fontSize: 10 }}>★ TOP</span>}
                      {r.nzb_title}
                    </div>
                  </td>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>
                    <FormatBadge format={r.format} />
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {r.release_group || '—'}
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {r.file_size_mb > 0 ? `${r.file_size_mb.toFixed(1)} MB` : '—'}
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {formatAge(r.age_days)}
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    <ScoreBadge score={r.score} />
                  </td>
                  <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                    {!added && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleForce(r, i)}
                        disabled={busy}
                        title="Force this specific release"
                      >
                        {forcingIdx === i ? <span className="spinner" /> : 'Force'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!searching && !adding && results.length === 0 && query && !added && (
        <div className="empty-state">No results found.</div>
      )}
    </div>
  )
}
