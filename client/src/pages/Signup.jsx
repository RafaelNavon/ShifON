import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import './Login.css'
import './Signup.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export default function Signup() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [tokenStatus, setTokenStatus] = useState('checking') // checking | valid | invalid
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return }
    fetch(`http://localhost:5000/api/invite/validate/${token}`)
      .then((r) => r.json())
      .then((d) => setTokenStatus(d.valid ? 'valid' : 'invalid'))
      .catch(() => setTokenStatus('invalid'))
  }, [token])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!EMAIL_REGEX.test(form.email)) e.email = 'Enter a valid email address'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.confirm && form.confirm !== form.password) e.confirm = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('http://localhost:5000/api/invite/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: form.name.trim(),
          email: form.email,
          password: form.password,
          confirmPassword: form.confirm,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || 'Signup failed'); return }
      navigate('/login?success=Account+created%21+You+can+now+log+in.')
    } catch {
      setSubmitError('Cannot connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  if (tokenStatus === 'checking') {
    return (
      <div className="login-page">
        <div className="login-card">
          <p style={{ color: 'var(--text)', textAlign: 'center', margin: 0 }}>Validating invite…</p>
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
          <p className="signup-invalid">This invite link is invalid or has expired.</p>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '8px' }}>
            Ask an admin to send you a new invite.
          </p>
        </div>
      </div>
    )
  }

  const strength = passwordStrength(form.password)
  const confirmMismatch = form.confirm && form.confirm !== form.password

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">S</span>
          <h1>ShifON</h1>
        </div>
        <p className="login-subtitle">Create your account</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="su-name">Full Name</label>
            <input
              id="su-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Your full name"
              autoFocus
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field">
            <label htmlFor="su-email">Email</label>
            <input
              id="su-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="su-pw">Password</label>
            <input
              id="su-pw"
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Min. 8 characters"
            />
            {form.password && (
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
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="field">
            <label htmlFor="su-confirm">Confirm Password</label>
            <input
              id="su-confirm"
              type="password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              placeholder="Repeat password"
              style={confirmMismatch ? { borderColor: '#ef4444' } : {}}
            />
            {confirmMismatch && <span className="field-error">Passwords do not match</span>}
          </div>

          {submitError && <p className="login-error">{submitError}</p>}

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="signup-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
