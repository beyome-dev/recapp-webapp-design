// src/components/ConsentModal.jsx
import { useState } from 'react'
import { X, Check } from 'lucide-react'
import './ConsentModal.css'

const TYPE_LABEL = {
  online:      'Online',
  'in-person': 'In-person',
  phone:       'Phone',
}

function formatSessionDate(dateStr, h, m) {
  const today    = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const d    = new Date(dateStr)
  const hh   = h % 12 || 12
  const mm   = String(m).padStart(2, '0')
  const ampm = h < 12 ? 'am' : 'pm'
  const time = `${hh}:${mm} ${ampm}`

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()

  if (sameDay(d, today))    return `Today, ${time}`
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`

  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${day}, ${time}`
}

export default function ConsentModal({ session, client, onClose, onStart }) {
  const [consentChoice, setConsentChoice] = useState('yes')

  return (
    <div className="consent-backdrop" onClick={onClose}>
      <div className="consent-panel" onClick={e => e.stopPropagation()}>

        <div className="consent-header">
          <span className="consent-header-title">Start Session</span>
          <button className="consent-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="consent-body">
          <div className="consent-session-info">
            <div className="consent-avatar" style={{ background: client.colour }}>
              {client.initials}
            </div>
            <div>
              <div className="consent-session-name">{client.name}</div>
              <div className="consent-session-meta">
                {session.service} · {TYPE_LABEL[session.type]} · {formatSessionDate(session.date, session.startH, session.startM)}
              </div>
            </div>
          </div>

          <div className="consent-question">
            Has {client.name} consented to recording?
          </div>
          <div className="consent-question-sub">
            Recording enables AI Scribe mode. If not consented, you can still document the session manually.
          </div>

          <div className="consent-radio-cards">
            <div
              className={`consent-card ${consentChoice === 'yes' ? 'consent-card--selected' : ''}`}
              onClick={() => setConsentChoice('yes')}
            >
              <div className={`consent-dot ${consentChoice === 'yes' ? 'consent-dot--filled' : 'consent-dot--empty'}`}>
                {consentChoice === 'yes' && <Check size={10} color="white" strokeWidth={3} />}
              </div>
              <div>
                <div className="consent-card-title">Yes — enable AI Scribe</div>
                <div className="consent-card-sub">Recording starts automatically</div>
              </div>
            </div>

            <div
              className={`consent-card ${consentChoice === 'no' ? 'consent-card--selected' : ''}`}
              onClick={() => setConsentChoice('no')}
            >
              <div className={`consent-dot ${consentChoice === 'no' ? 'consent-dot--filled' : 'consent-dot--empty'}`}>
                {consentChoice === 'no' && <Check size={10} color="white" strokeWidth={3} />}
              </div>
              <div>
                <div className="consent-card-title">No — handwritten notes</div>
                <div className="consent-card-sub">Write notes manually · recording off</div>
              </div>
            </div>
          </div>

          <button className="consent-start-btn" onClick={() => onStart(consentChoice === 'yes')}>
            Start Session
          </button>
        </div>

      </div>
    </div>
  )
}
