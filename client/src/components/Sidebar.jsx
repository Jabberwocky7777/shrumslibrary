import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const NAV_ITEMS = [
  { path: '/search',   label: 'Search'  },
  { path: '/queue',    label: 'Queue'   },
  { path: '/library',  label: 'Library' },
  { path: '/settings', label: 'Settings'},
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [status, setStatus] = useState({ prowlarr: null, sabnzbd: null })
  const [isLocal, setIsLocal] = useState(true)

  useEffect(() => {
    axios.get('/api/auth/status').then(({ data }) => setIsLocal(data.isLocal))
  }, [])

  async function testConnections() {
    const [p, s] = await Promise.allSettled([
      axios.post('/api/test/prowlarr'),
      axios.post('/api/test/sabnzbd'),
    ])
    setStatus({
      prowlarr: p.status === 'fulfilled' && p.value.data.ok,
      sabnzbd:  s.status === 'fulfilled' && s.value.data.ok,
    })
  }

  useEffect(() => { testConnections() }, [])

  async function handleLogout() {
    await axios.post('/api/auth/logout')
    window.location.href = '/login'
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-deep)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      height: '100vh',
    }}>
      {/* Wordmark */}
      <div style={{
        padding: '0 20px 24px',
        fontFamily: 'var(--font-mono)',
        fontSize: '15px',
        fontWeight: 700,
        color: 'var(--accent)',
        letterSpacing: '0.02em',
      }}>
        ShrumsLibrary
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: 'block',
              padding: '9px 20px',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              background: isActive ? 'var(--bg-raised)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              transition: 'all 0.1s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Connection status dots */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Connections
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => navigate('/settings/prowlarr')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12 }}
            title="Go to Prowlarr settings"
          >
            <StatusDot ok={status.prowlarr} /> Prowlarr
          </button>
          <button
            onClick={() => navigate('/settings/sabnzbd')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12 }}
            title="Go to SABnzbd settings"
          >
            <StatusDot ok={status.sabnzbd} /> SABnzbd
          </button>
        </div>

        {/* Logout — only shown when accessed publicly */}
        {!isLocal && (
          <button
            onClick={handleLogout}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '6px 0',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            Log out
          </button>
        )}
      </div>
    </aside>
  )
}

function StatusDot({ ok }) {
  const color = ok === null ? 'var(--text-dim)' : ok ? 'var(--success)' : 'var(--error)'
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, display: 'inline-block',
      boxShadow: ok === true ? `0 0 4px ${color}` : 'none',
    }} />
  )
}
