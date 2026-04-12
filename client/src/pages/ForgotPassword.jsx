import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'
import './Signup.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // swallow — always show the same message
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">S</span>
          <h1>ShifON</h1>
        </div>
        <p className="login-subtitle">Reset your password</p>

        {submitted ? (
          <>
            <div className="forgot-sent">
              If this email exists, a reset link has been sent. Check your inbox.
            </div>
            <p className="signup-footer" style={{ marginTop: '20px' }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fp-email">Email</label>
              <input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="signup-footer" style={{ marginTop: 0 }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
