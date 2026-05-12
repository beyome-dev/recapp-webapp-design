import { Link, useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import './Signup.css'

export default function Signup() {
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    navigate('/login')
  }

  return (
    <div className="signup-page">
      <Link className="logo-lockup" to="/" aria-label="Recapp home">
        <div className="logo-mark">
          <Activity size={14} />
        </div>
        <span className="logo-name">Recapp</span>
      </Link>

      <div className="card">
        <h1 className="card-title">Create your account</h1>
        <p className="card-subtitle">Get your practice set up in minutes.</p>

        <form id="signupForm" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="fullname">Full name</label>
            <input
              type="text"
              id="fullname"
              placeholder="Dr. Priya Sharma"
              autoComplete="name"
              required
              aria-describedby="fullnameHint"
              aria-invalid="false"
            />
            <p className="field-hint" id="fullnameHint"></p>
          </div>
          <div className="field">
            <label htmlFor="practice">Practice name</label>
            <input
              type="text"
              id="practice"
              name="practice"
              placeholder="e.g. Calm Mind Clinic"
              autoComplete="organization"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              type="email"
              id="email"
              placeholder="you@yourpractice.com"
              autoComplete="email"
              required
              aria-describedby="emailHint"
              aria-invalid="false"
            />
            <p className="field-hint" id="emailHint"></p>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              aria-describedby="passwordHint"
              aria-invalid="false"
            />
            <p className="field-hint" id="passwordHint">At least 8 characters</p>
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              aria-describedby="confirmHint"
              aria-invalid="false"
            />
            <p className="field-hint" id="confirmHint"></p>
          </div>

          <div className="divider"></div>

          <p className="terms">By creating an account you agree to our Terms of Service and Privacy Policy.</p>

          <button type="submit" className="btn-primary">Create account</button>
        </form>

        <p className="card-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
