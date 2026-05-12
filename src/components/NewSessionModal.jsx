// src/components/NewSessionModal.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Plus, Check } from 'lucide-react'
import { useSessions } from '../context/SessionsContext'
import { useClients } from '../context/ClientsContext'
import './NewSessionModal.css'

const SERVICES = [
  { id: 'svc1', label: 'Individual Therapy', duration: 50 },
  { id: 'svc2', label: 'Couples Therapy',    duration: 80 },
  { id: 'svc3', label: 'Assessment',          duration: 90 },
]

function currentDateStr() {
  const d   = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function currentTimeStr() {
  const d   = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NewSessionModal({ onClose, preselectedClient = null }) {
  const { addSession } = useSessions()
  const { clients, addClient } = useClients()
  const navigate = useNavigate()

  const [step,           setStep]           = useState(preselectedClient ? 2 : 1)
  const [query,          setQuery]          = useState('')
  const [selectedClient, setSelectedClient] = useState(preselectedClient)
  const [showAddForm,    setShowAddForm]    = useState(false)
  const [newClientName,  setNewClientName]  = useState('')
  const [sessionType,    setSessionType]    = useState('in-person')
  const [serviceId,      setServiceId]      = useState('svc1')
  const [sessionDate,    setSessionDate]    = useState(currentDateStr)
  const [sessionTime,    setSessionTime]    = useState(currentTimeStr)
  const [consentChoice,  setConsentChoice]  = useState('yes')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleSelectClient(client) {
    setSelectedClient(client)
    setStep(2)
  }

  function handleStartSession() {
    const consentGiven = consentChoice === 'yes'
    const svc = SERVICES.find(s => s.id === serviceId)
    const [startH, startM] = sessionTime.split(':').map(Number)

    const id = addSession({
      clientId:        selectedClient.id,
      type:            sessionType,
      service:         svc.label,
      duration:        svc.duration,
      date:            sessionDate,
      startH,
      startM,
      status:          'in-progress',
      mode:            consentGiven ? 'ai-scribe' : 'handwritten',
      consentGiven,
      recordingActive: consentGiven,
      elapsedSeconds:  0,
      noteTitle:       `Session with ${selectedClient.name}`,
      noteContent:     '',
      noteEnhanced:    false,
      noteLocked:      false,
      rawNoteContent:  '',
      pse:     { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
      billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
    })
    onClose()
    navigate(`/sessions/${id}/active`)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="nsm-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="nsm-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>New Session</span>
          <button className="nsm-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Progress bar */}
        <div className="nsm-progress-bar">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`nsm-progress-segment ${step >= n ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* ── Step 1: Client search ── */}
        {step === 1 && (
          <div className="nsm-body">
            <h2 className="nsm-title">Select a client</h2>
            <p className="nsm-sub">Search for an existing client or add a new one.</p>

            <div className="nsm-search-wrap">
              <Search size={14} className="nsm-search-icon" />
              <input
                className="nsm-search"
                placeholder="Search clients…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="nsm-client-list">
              {filtered.map(c => (
                <button key={c.id} className="nsm-client-row" onClick={() => handleSelectClient(c)}>
                  <div className="nsm-avatar" style={{ background: c.colour }}>{c.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{c.name}</div>
                  </div>
                </button>
              ))}

              {!showAddForm && (
                <button className="nsm-add-row" onClick={() => setShowAddForm(true)}>
                  <Plus size={13} />
                  Add new client
                </button>
              )}

              {showAddForm && (
                <div className="nsm-add-form">
                  <input
                    className="nsm-input"
                    placeholder="Client name"
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                  />
                  <button
                    className="nsm-add-confirm"
                    disabled={!newClientName.trim()}
                    onClick={() => {
                      const parts = newClientName.trim().split(/\s+/)
                      const firstName = parts[0]
                      const lastName  = parts.slice(1).join(' ') || ''
                      const created = addClient({ firstName, lastName, colour: '#6D28D9' })
                      handleSelectClient(created)
                    }}
                  >
                    Add &amp; Continue
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Session details ── */}
        {step === 2 && (
          <div className="nsm-body">
            <h2 className="nsm-title">Session details</h2>
            <p className="nsm-sub">
              Confirm details for <strong>{selectedClient?.name}</strong>.
            </p>

            {/* Date + Time side by side */}
            <div className="nsm-field-row" style={{ marginBottom: 'var(--space-1)' }}>
              <div className="nsm-field">
                <label className="nsm-label">Date</label>
                <input
                  type="date"
                  className="nsm-input"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                />
              </div>
              <div className="nsm-field">
                <label className="nsm-label">Time</label>
                <input
                  type="time"
                  className="nsm-input"
                  value={sessionTime}
                  onChange={e => setSessionTime(e.target.value)}
                />
              </div>
            </div>
            <p className="nsm-field-hint">Auto-filled to now · editable if needed</p>

            {/* Session type — segmented control */}
            <div className="nsm-field" style={{ marginTop: 'var(--space-4)' }}>
              <label className="nsm-label">Session Type</label>
              <div className="nsm-segment-wrap">
                {['in-person', 'online', 'phone'].map(t => (
                  <button
                    key={t}
                    className={`nsm-segment-btn ${sessionType === t ? 'selected' : ''}`}
                    onClick={() => setSessionType(t)}
                  >
                    {t === 'in-person' ? 'In-person' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Service */}
            <div className="nsm-field">
              <label className="nsm-label">Service</label>
              <select
                className="nsm-input"
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
              >
                {SERVICES.map(s => (
                  <option key={s.id} value={s.id}>{s.label} ({s.duration} min)</option>
                ))}
              </select>
            </div>

            <button className="nsm-primary-btn" onClick={() => setStep(3)}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 3: Consent ── */}
        {step === 3 && (
          <div className="nsm-body">
            <h2 className="nsm-title">Recording consent</h2>
            <p className="nsm-sub">
              Has <strong>{selectedClient?.name}</strong> consented to recording?
            </p>

            <div className="nsm-radio-cards">
              <div
                className={`nsm-radio-card ${consentChoice === 'yes' ? 'nsm-radio-card-yes' : 'nsm-radio-card-no'}`}
                onClick={() => setConsentChoice('yes')}
              >
                <div className={`nsm-radio-dot ${consentChoice === 'yes' ? 'nsm-radio-dot-filled' : 'nsm-radio-dot-empty'}`}>
                  {consentChoice === 'yes' && <Check size={10} color="white" strokeWidth={3} />}
                </div>
                <div>
                  <div className="nsm-radio-card-title">Yes — enable AI Scribe</div>
                  <div className="nsm-radio-card-sub">Recording starts automatically</div>
                </div>
              </div>

              <div
                className={`nsm-radio-card ${consentChoice === 'no' ? 'nsm-radio-card-yes' : 'nsm-radio-card-no'}`}
                onClick={() => setConsentChoice('no')}
              >
                <div className={`nsm-radio-dot ${consentChoice === 'no' ? 'nsm-radio-dot-filled' : 'nsm-radio-dot-empty'}`}>
                  {consentChoice === 'no' && <Check size={10} color="white" strokeWidth={3} />}
                </div>
                <div>
                  <div className="nsm-radio-card-title">No — handwritten notes</div>
                  <div className="nsm-radio-card-sub">Write notes manually · recording off by default</div>
                </div>
              </div>
            </div>

            <button className="nsm-primary-btn" onClick={handleStartSession}>
              Start Session
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
