import React, { useState } from 'react'
import axios from 'axios'
import ScoreBadge from '../components/ScoreBadge'

export default function Search() {
  const [query, setQuery] = useState('')
  const [author, setAuthor] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [requestedIds, setRequestedIds] = useState(new Set())
  const [requesting, setRequesting] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults([])

    try {
      const { data } = await axios.get('/api/search', { params: { q: query, author } })
      setResults(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function requestRelease(release, index) {
    setRequesting(index)
    try {
      await axios.post('/api/request', {
        title: query,
        author,
        nzb_title: release.nzb_title,
        release_group: release.release_group,
        file_size_mb: release.file_size_mb,
        score: release.score,
        nzb_url: release.nzb_url,
        allResults: results,
      })
      setRequestedIds(prev => new Set([...prev, index]))
    } catch (err) {
      alert(err.response?.data?.error || 'Request failed')
    } finally {
      setRequesting(null)
    }
  }

  return (
    <div>
      <h1 className="page-title">Search</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 2, marginBottom: 0 }}>
          <label>Title</label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Project Hail Mary"
          />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Author</label>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="e.g. Andy Weir"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !query.trim()}
          style={{ flexShrink: 0 }}
        >
          {loading ? <span className="spinner" /> : 'Search'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--error)', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {results.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            {results.length} results — sorted by score
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Release', 'Group', 'Size', 'Score', ''].map(h => (
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
              {results.map((r, i) => {
                const isFirst = i === 0
                const isRequested = requestedIds.has(i)
                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isFirst ? 'rgba(129,140,248,0.05)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '9px 10px', maxWidth: 440 }}>
                      <div style={{
                        fontSize: 12, fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        color: 'var(--text)',
                      }}>
                        {isFirst && <span style={{ color: 'var(--accent)', marginRight: 6, fontSize: 10 }}>★ TOP</span>}
                        {r.nzb_title}
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {r.release_group || '—'}
                    </td>
                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {r.file_size_mb > 0 ? `${r.file_size_mb.toFixed(1)} MB` : '—'}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <ScoreBadge score={r.score} />
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => requestRelease(r, i)}
                        disabled={isRequested || requesting !== null}
                      >
                        {requesting === i ? <span className="spinner" /> : isRequested ? 'Requested' : 'Request'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="empty-state">No results found.</div>
      )}
    </div>
  )
}
