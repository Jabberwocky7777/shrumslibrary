import React, { useEffect, useState } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import SegmentedControl from '../components/SegmentedControl'
import ConnectionField from '../components/ConnectionField'
import TestButton from '../components/TestButton'
import KindleAddressList from '../components/KindleAddressList'

// ── Section nav ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { path: 'appearance', label: 'Appearance' },
  { path: 'security',   label: 'Security'   },
  { path: 'prowlarr',   label: 'Prowlarr'   },
  { path: 'sabnzbd',    label: 'SABnzbd'    },
  { path: 'download',   label: 'Download'   },
  { path: 'kindle',     label: 'Kindle'     },
]

function SectionNav() {
  return (
    <nav style={{
      width: 160,
      flexShrink: 0,
      marginRight: 32,
    }}>
      {SECTIONS.map(({ path, label }) => (
        <NavLink
          key={path}
          to={path}
          style={({ isActive }) => ({
            display: 'block',
            padding: '8px 14px',
            fontSize: 13,
            color: isActive ? 'var(--text)' : 'var(--text-muted)',
            background: isActive ? 'var(--bg-raised)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            textDecoration: 'none',
            borderRadius: '0 var(--radius) var(--radius) 0',
            marginBottom: 2,
            fontWeight: isActive ? 500 : 400,
            transition: 'all 0.1s',
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

// ── Shared hooks ──────────────────────────────────────────────────────────────

function useConfig() {
  const [config, setConfig] = useState({})
  const [defaultCreds, setDefaultCreds] = useState(false)

  async function loadConfig() {
    const { data } = await axios.get('/api/config')
    const { usingDefaultCredentials, ...rest } = data
    setConfig(rest)
    setDefaultCreds(!!usingDefaultCredentials)
  }

  useEffect(() => { loadConfig() }, [])

  return { config, setConfig, defaultCreds, reload: loadConfig }
}

async function saveConfig(updates) {
  await axios.post('/api/config', updates)
}

// ── Appearance ────────────────────────────────────────────────────────────────

function Appearance({ config, setConfig }) {
  async function handleThemeChange(theme) {
    setConfig(c => ({ ...c, theme }))
    await saveConfig({ theme })
    window.location.reload()
  }

  return (
    <div className="card">
      <div className="card-header"><h2>Appearance</h2></div>
      <div className="card-description">Choose your preferred colour palette.</div>
      <div className="field">
        <label>Theme</label>
        <SegmentedControl
          value={config.theme || 'zinc-indigo'}
          onChange={handleThemeChange}
          options={[
            { value: 'zinc-indigo',   label: 'Zinc / Indigo'   },
            { value: 'graphite-rose', label: 'Graphite / Rose' },
          ]}
        />
      </div>
    </div>
  )
}

// ── Security ──────────────────────────────────────────────────────────────────

function Security({ defaultCreds, reload }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (password && password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const updates = {}
      if (username) updates.admin_username = username
      if (password) updates.admin_password = password
      if (Object.keys(updates).length === 0) return
      await saveConfig(updates)
      setSaved(true)
      setUsername('')
      setPassword('')
      setConfirm('')
      reload()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h2>Security</h2></div>
      <div className="card-description">Manage login credentials for public access.</div>

      {defaultCreds && (
        <div className="warning-banner">
          <span>⚠</span>
          <span>
            You are using default credentials. Change your password before exposing this app publicly.
          </span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="field">
          <label>New Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Leave blank to keep current"
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>New Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
        </div>

        {error && <div style={{ color: 'var(--error)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {saved && <div style={{ color: 'var(--success)', fontSize: 12, marginBottom: 12 }}>✓ Saved</div>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      <hr className="divider" />
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Local network access (192.168.x.x, 10.x.x.x) does not require login.
        Authentication is enforced when accessed via a reverse proxy or public URL.
      </div>
    </div>
  )
}

// ── Prowlarr ──────────────────────────────────────────────────────────────────

function Prowlarr({ config, setConfig }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveConfig({
        prowlarr_url: config.prowlarr_url || '',
        prowlarr_api_key: config.prowlarr_api_key || '',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h2>Prowlarr</h2></div>
      <div className="card-description">
        Prowlarr aggregates your indexers. Add your indexers in Prowlarr, not here.
      </div>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>URL</label>
          <input
            type="text"
            value={config.prowlarr_url || ''}
            onChange={e => setConfig(c => ({ ...c, prowlarr_url: e.target.value }))}
            placeholder="http://prowlarr:9696"
          />
        </div>
        <ConnectionField
          label="API Key"
          value={config.prowlarr_api_key || ''}
          onChange={v => setConfig(c => ({ ...c, prowlarr_api_key: v }))}
          hint="Found in Prowlarr → Settings → General → API Key"
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <TestButton endpoint="/api/test/prowlarr" label="Test Connection" />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  )
}

// ── SABnzbd ───────────────────────────────────────────────────────────────────

function Sabnzbd({ config, setConfig }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveConfig({
        sabnzbd_url: config.sabnzbd_url || '',
        sabnzbd_api_key: config.sabnzbd_api_key || '',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h2>SABnzbd</h2></div>
      <div className="card-description">
        SABnzbd handles all downloading. Make sure an "ebooks" category exists in SABnzbd pointed at your complete folder.
      </div>
      <form onSubmit={handleSave}>
        <div className="field">
          <label>URL</label>
          <input
            type="text"
            value={config.sabnzbd_url || ''}
            onChange={e => setConfig(c => ({ ...c, sabnzbd_url: e.target.value }))}
            placeholder="http://sabnzbd:8080"
          />
        </div>
        <ConnectionField
          label="API Key"
          value={config.sabnzbd_api_key || ''}
          onChange={v => setConfig(c => ({ ...c, sabnzbd_api_key: v }))}
          hint="Found in SABnzbd → Config → General → API Key"
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <TestButton endpoint="/api/test/sabnzbd" label="Test Connection" />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  )
}

// ── Download ──────────────────────────────────────────────────────────────────

function Download({ config, setConfig }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveConfig({ auto_grab: config.auto_grab || 'true' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h2>Download</h2></div>
      <div className="card-description">Configure automatic download behaviour.</div>
      <form onSubmit={handleSave}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={config.auto_grab !== 'false'}
              onChange={e => setConfig(c => ({ ...c, auto_grab: e.target.checked ? 'true' : 'false' }))}
              style={{ width: 'auto' }}
            />
            Auto-grab
          </label>
          <div className="field-hint">
            Automatically grab the highest scored release when requesting a book.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  )
}

// ── Kindle ────────────────────────────────────────────────────────────────────

function Kindle({ config, setConfig }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [testEmail, setTestEmail] = useState('')

  async function loadAddresses() {
    const { data } = await axios.get('/api/kindle-addresses')
    setAddresses(data)
  }

  useEffect(() => { loadAddresses() }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveConfig({
        smtp_host: config.smtp_host || '',
        smtp_port: config.smtp_port || '587',
        smtp_user: config.smtp_user || '',
        smtp_pass: config.smtp_pass || '',
        smtp_from: config.smtp_from || '',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* SMTP */}
      <div className="card">
        <div className="card-header"><h2>Kindle — SMTP</h2></div>
        <div className="card-description">
          Configure the outbound email server. The "From" address must be approved in your Amazon Kindle settings.
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0 12px' }}>
            <div className="field">
              <label>SMTP Host</label>
              <input
                type="text"
                value={config.smtp_host || ''}
                onChange={e => setConfig(c => ({ ...c, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>Port</label>
              <input
                type="number"
                value={config.smtp_port || '587'}
                onChange={e => setConfig(c => ({ ...c, smtp_port: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              value={config.smtp_user || ''}
              onChange={e => setConfig(c => ({ ...c, smtp_user: e.target.value }))}
              placeholder="your@email.com"
            />
          </div>
          <ConnectionField
            label="Password"
            value={config.smtp_pass || ''}
            onChange={v => setConfig(c => ({ ...c, smtp_pass: v }))}
            hint="App password recommended for Gmail/Outlook"
          />
          <div className="field">
            <label>From Address</label>
            <input
              type="email"
              value={config.smtp_from || ''}
              onChange={e => setConfig(c => ({ ...c, smtp_from: e.target.value }))}
              placeholder="your@email.com"
            />
            <div className="field-hint">Must match an approved sender in your Amazon account.</div>
          </div>

          {/* Test email */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="Send test to…"
              style={{ maxWidth: 220 }}
            />
            <TestButton
              endpoint="/api/test/kindle"
              payload={{ to: testEmail }}
              label="Send Test Email"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save SMTP'}
            </button>
            {saved && <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Saved</span>}
          </div>
        </form>
      </div>

      {/* Kindle addresses */}
      <div className="card">
        <div className="card-header"><h2>Kindle Addresses</h2></div>
        <div className="card-description">
          Manage the Kindle email addresses books can be sent to.
        </div>
        <KindleAddressList addresses={addresses} onRefresh={loadAddresses} />
      </div>
    </div>
  )
}

// ── Settings root ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { config, setConfig, defaultCreds, reload } = useConfig()

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <SectionNav />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Routes>
            <Route index element={<Navigate to="appearance" replace />} />
            <Route path="appearance" element={<Appearance config={config} setConfig={setConfig} />} />
            <Route path="security" element={<Security defaultCreds={defaultCreds} reload={reload} />} />
            <Route path="prowlarr" element={<Prowlarr config={config} setConfig={setConfig} />} />
            <Route path="sabnzbd" element={<Sabnzbd config={config} setConfig={setConfig} />} />
            <Route path="download" element={<Download config={config} setConfig={setConfig} />} />
            <Route path="kindle" element={<Kindle config={config} setConfig={setConfig} />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
