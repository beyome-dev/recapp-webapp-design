// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    setError(false)
    const success = login(email)
    if (success) {
      navigate('/home')
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="login-page">
      <Link className="logo-lockup" to="/">
        <div className="logo-mark">
          <Activity size={14} />
        </div>
        <span className="logo-name">Recapp</span>
      </Link>

      <div className="card">
        <h1 className="card-title">Welcome back</h1>
        <p className="card-subtitle">Sign in to your Recapp account.</p>

        {error && (
          <div className="error-msg" role="alert">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>No account found with that email.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={error ? 'input-error' : ''}
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={error ? 'input-error' : ''}
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>
          <button type="submit" className="btn-primary">Sign in</button>
        </form>

        <p className="card-footer">
          Don't have an account? <Link to="/signup">Get started</Link>
        </p>
      </div>
    </div>
  )
}
