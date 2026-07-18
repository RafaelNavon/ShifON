import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import './Login.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const successMsg = params.get('success')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-top">
          <span className="login-left-logo">S</span>
          <h1 className="login-left-title">ShifON</h1>
          <p className="login-left-subtitle" dir="rtl">Lab Management System</p>
        </div>
        <div className="login-left-stats">
          <div className="login-left-stat">
            <span className="login-left-stat-num">—</span>
            <span className="login-left-stat-label">Bulls</span>
          </div>
          <div className="login-left-stat">
            <span className="login-left-stat-num">—</span>
            <span className="login-left-stat-label">Straws</span>
          </div>
          <div className="login-left-stat">
            <span className="login-left-stat-num">—</span>
            <span className="login-left-stat-label">Tanks</span>
          </div>
        </div>
      </div>

      <div className="login-right">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">S</span>
          <h1>ShifON</h1>
        </div>
        <p className="login-subtitle">Lab Management System</p>

        {successMsg && <p className="login-success">{successMsg}</p>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
