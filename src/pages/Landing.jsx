import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <nav>
        <Link className="nav-logo" to="/">
          <div className="logo-mark">
            <Activity size={14} />
          </div>
          <span className="logo-name">Recapp</span>
        </Link>
        <Link className="btn-signin" to="/login">Sign in</Link>
      </nav>

      <section className="hero">
        <p className="hero-eyebrow">For mental health practices in India</p>
        <h1 className="hero-headline">The practice management system built for presence.</h1>
        <p className="hero-sub">Scheduling, clinical notes, billing, and AI-assisted documentation — so your only job in session is to be present.</p>
        <div className="hero-actions">
          <Link className="btn-primary" to="/signup">Get started</Link>
          <Link className="hero-signin-link" to="/login">Already have an account? <span>Sign in</span></Link>
        </div>
      </section>

      <footer>
        &copy; 2026 Recapp. Built for mental health professionals.
      </footer>
    </div>
  );
}
