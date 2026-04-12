import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import './Layout.css'

const NAV = [
  {
    to: '/dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    to: '/inventory', label: 'Inventory',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    to: '/bulls', label: 'Bulls',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  },
  {
    to: '/shipments', label: 'Shipments',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
  {
    to: '/daily-log', label: 'Daily Log',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>,
  },
  {
    to: '/tasks', label: 'Tasks',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [inviteModal, setInviteModal] = useState(false)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="layout">
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">S</span>
          <span className="sidebar-brand">ShifON</span>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{(user.name || 'U')[0].toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user.name || user.email}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          {user.role === 'admin' && (
            <button className="sidebar-invite" onClick={() => setInviteModal(true)}>
              + Invite someone
            </button>
          )}
          <button className="sidebar-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="layout-main">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <Outlet />
      </div>

      {inviteModal && <InviteModal onClose={() => setInviteModal(false)} />}
    </div>
  )
}

function InviteModal({ onClose }) {
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useState(() => {
    apiFetch('/api/invite/create', { method: 'POST' })
      .then((r) => r?.json())
      .then((d) => {
        if (d?.link) setLink(d.link)
        else setError(d?.error || 'Failed to create invite')
        setLoading(false)
      })
      .catch(() => {
        setError('Network error')
        setLoading(false)
      })
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Invite someone</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-form">
          {loading && <p style={{ color: 'var(--text)', margin: 0 }}>Generating link…</p>}
          {error && <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>}
          {link && (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px' }}>
                Share this link. It expires in <strong>48 hours</strong>.
              </p>
              <div className="invite-link-row">
                <input
                  type="text"
                  className="invite-link-input"
                  value={link}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <button className="btn-primary" onClick={copyLink}>
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </>
          )}
          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
