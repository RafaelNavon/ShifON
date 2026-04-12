import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import './Login.css'
import './Signup.css'

function passwordStrength(p) {
  if (!p) return { score: 0, label: '', color: '' }
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' }
  if (score <= 3) return { score, label: 'Good', color: '#3b82f6' }
  return { score, label: 'Strong', color: '#22c55e' }
}

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [tokenStatus, setTokenStatus] = useState('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return }
    fetch(`http://localhost:5000/api/auth/reset-password/${token}`)
      .then((r) => r.json())
      .then((d) => setTokenStatus(d.valid ? 'valid' : 'invalid'))
      .catch(() => setTokenStatus('invalid'))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reset failed'); return }
      navigate('/login?success=Password+reset+successfully')
    } catch {
      setError('Cannot connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  if (tokenStatus === 'checking') {
    return (
      <div className="login-page">
        <div className="login-card">
          <p style={{ color: 'var(--text)', textAlign: 'center', margin: 0 }}>Validating link…</p>
        </div>
      </div>
    )
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <span className="login-logo">S</span>
            <h1>ShifON</h1>
          </div>
          <p className="signup-invalid">This reset link is invalid or has expired.</p>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '8px' }}>
            <Link to="/forgot-password" style={{ color: 'var(--accent)' }}>Request a new reset link</Link>
          </p>
        </div>
      </div>
    )
  }

  const strength = passwordStrength(password)
  const confirmMismatch = confirm && confirm !== password

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">S</span>
          <h1>ShifON</h1>
        </div>
        <p className="login-subtitle">Choose a new password</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="rp-pw">New Password</label>
            <input
              id="rp-pw"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Min. 8 characters"
              autoFocus
            />
            {password && (
              <div className="strength-bar-wrap">
                <div className="strength-bar">
                  {[1,2,3,4].map((i) => (
                    <div
                      key={i}
                      className="strength-segment"
                      style={{ background: i <= strength.score ? strength.color : 'var(--border)' }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="rp-confirm">Confirm New Password</label>
            <input
              id="rp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError('') }}
              placeholder="Repeat password"
              style={confirmMismatch ? { borderColor: '#ef4444' } : {}}
            />
            {confirmMismatch && <span className="field-error">Passwords do not match</span>}
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Saving…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
