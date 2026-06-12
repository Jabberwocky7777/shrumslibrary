import React, { useState } from 'react'
import axios from 'axios'

export default function KindleAddressList({ addresses, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ label: '', email: '', is_default: false })
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setForm({ label: '', email: '', is_default: false })
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(addr) {
    setForm({ label: addr.label, email: addr.email, is_default: !!addr.is_default })
    setEditId(addr.id)
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setEditId(null)
  }

  async function save() {
    setSaving(true)
    try {
      if (editId) {
        await axios.put(`/api/kindle-addresses/${editId}`, form)
      } else {
        await axios.post('/api/kindle-addresses', form)
      }
      setShowForm(false)
      setEditId(null)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteAddr(id) {
    if (!confirm('Delete this Kindle address?')) return
    await axios.delete(`/api/kindle-addresses/${id}`)
    onRefresh()
  }

  return (
    <div>
      {/* Address list */}
      {addresses.length === 0 && !showForm && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
          No Kindle addresses saved yet.
        </p>
      )}

      {addresses.map((addr) => (
        <div key={addr.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--bg-deep)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: 6,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{addr.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{addr.email}</div>
          </div>
          {!!addr.is_default && (
            <span className="badge" style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--accent)' }}>Default</span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(addr)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => deleteAddr(addr.id)}>Delete</button>
        </div>
      ))}

      {/* Inline add/edit form */}
      {showForm && (
        <div style={{
          padding: '16px',
          background: 'var(--bg-deep)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)',
          marginBottom: 8,
        }}>
          <div className="field">
            <label>Label</label>
            <input
              type="text"
              placeholder="e.g. Living Room Kindle"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="name@kindle.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                style={{ width: 'auto' }}
              />
              Set as default
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button className="btn btn-ghost btn-sm" onClick={openAdd} style={{ marginTop: 4 }}>
          + Add Kindle Address
        </button>
      )}
    </div>
  )
}
