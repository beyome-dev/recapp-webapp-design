// src/pages/SessionsList.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, MapPin, Phone, Plus, Circle } from 'lucide-react'
import { useSessions } from '../context/SessionsContext'
import { useClients } from '../context/ClientsContext'
import NewSessionModal from '../components/NewSessionModal'
import ConsentModal from '../components/ConsentModal'
import sessionEmptyImg from '../assets/session_empty.png'
import './SessionsList.css'

const TYPE_ICON = {
  online:      <Video size={13} />,
  'in-person': <MapPin size={13} />,
  phone:       <Phone size={13} />,
}

const TYPE_LABEL = {
  online:      'Online',
  'in-person': 'In-person',
  phone:       'Phone',
}

const STATUS_CONFIG = {
  upcoming:      { label: 'Upcoming',    cls: 'badge-blue'    },
  'in-progress': { label: 'In Progress', cls: 'badge-green'   },
  paused:        { label: 'Paused',      cls: 'badge-amber'   },
  completed:     { label: 'Completed',   cls: 'badge-neutral' },
}

const FILTERS = ['All', 'Upcoming', 'In Progress', 'Paused', 'Completed']

const FILTER_STATUS = {
  'All':         null,
  'Upcoming':    'upcoming',
  'In Progress': 'in-progress',
  'Paused':      'paused',
  'Completed':   'completed',
}

function formatSessionDate(dateStr, h, m) {
  const today    = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const d     = new Date(dateStr)
  const hh    = h % 12 || 12
  const mm    = String(m).padStart(2, '0')
  const ampm  = h < 12 ? 'am' : 'pm'
  const time  = `${hh}:${mm} ${ampm}`

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()

  if (sameDay(d, today))    return `Today, ${time}`
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`

  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${day}, ${time}`
}

export default function SessionsList() {
  const { sessions, getSessionNumber, updateSession } = useSessions()
  const { getClient } = useClients()
  const navigate = useNavigate()
  const [showModal,          setShowModal]          = useState(false)
  const [activeFilter,       setActiveFilter]       = useState('All')
  const [selectedUpcomingId, setSelectedUpcomingId] = useState(null)

  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const filterStatus = FILTER_STATUS[activeFilter]
  const visible = filterStatus ? sorted.filter(s => s.status === filterStatus) : sorted

  function handleRowClick(session) {
    if (session.status === 'upcoming') {
      setSelectedUpcomingId(session.id)
    } else if (session.status === 'in-progress' || session.status === 'paused') {
      navigate(`/sessions/${session.id}/active`)
    } else if (session.status === 'completed') {
      navigate(`/sessions/${session.id}/notes`)
    }
  }

  function handleConsentStart(consentGiven) {
    updateSession(selectedUpcomingId, {
      status:          'in-progress',
      mode:            consentGiven ? 'ai-scribe' : 'handwritten',
      consentGiven,
      recordingActive: consentGiven,
    })
    const id = selectedUpcomingId
    setSelectedUpcomingId(null)
    navigate(`/sessions/${id}/active`)
  }

  const upcomingSession = selectedUpcomingId
    ? sessions.find(s => s.id === selectedUpcomingId)
    : null
  const upcomingClient = upcomingSession ? getClient(upcomingSession.clientId) : null

  return (
    <div className="sessions-list-page">

      <div className="sessions-header">
        <div>
          <h1 className="sessions-title">Sessions</h1>
          <p className="sessions-subtitle">{sessions.length} sessions · {sessions.filter(s => s.status === 'upcoming').length} upcoming</p>
        </div>
        <button className="btn-new-session" onClick={() => setShowModal(true)}>
          <Plus size={14} />
          New Session
        </button>
      </div>

      <div className="sessions-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-tab ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="sessions-table-wrap">
        <div className="sessions-thead">
          <div className="sessions-col-grid">
            <div className="sessions-th">Client</div>
            <div className="sessions-th">Date &amp; Time</div>
            <div className="sessions-th">Type</div>
            <div className="sessions-th">Service</div>
            <div className="sessions-th">Session #</div>
            <div className="sessions-th sessions-th-right">Status</div>
          </div>
        </div>

        {visible.length === 0 && (
          <div className="sessions-empty">
            <img src={sessionEmptyImg} alt="" className="empty-img" />
            <p className="empty-text">
              {sessions.length === 0
                ? 'No sessions yet. Create your first session to get started.'
                : 'No sessions match the selected filter.'}
            </p>
          </div>
        )}

        {visible.map(session => {
          const client    = getClient(session.clientId)
          const sessNum   = getSessionNumber(session.clientId, session.id)
          const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.upcoming

          const rowClass = [
            'sessions-row',
            'row-clickable',
            session.status === 'in-progress' ? 'row-in-progress' : '',
            session.status === 'paused'       ? 'row-paused'       : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={session.id}
              className={rowClass}
              onClick={() => handleRowClick(session)}
            >
              <div className="sessions-col-grid">
                <div className="client-cell">
                  <div className="client-avatar" style={{ background: client?.colour }}>
                    {client?.initials}
                  </div>
                  <span className="client-name">{client?.name}</span>
                </div>
                <div className="cell-date">
                  {formatSessionDate(session.date, session.startH, session.startM)}
                </div>
                <div className="type-chip">
                  {TYPE_ICON[session.type]}
                  {TYPE_LABEL[session.type]}
                </div>
                <div className="cell-service">{session.service}</div>
                <div className="cell-sessnum">Session {sessNum}</div>
                <div className="cell-status">
                  <span className={`status-badge ${statusCfg.cls}`}>
                    {session.status === 'in-progress' && (
                      <Circle size={6} className="active-dot" />
                    )}
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <NewSessionModal onClose={() => setShowModal(false)} />
      )}

      {upcomingSession && upcomingClient && (
        <ConsentModal
          session={upcomingSession}
          client={upcomingClient}
          onClose={() => setSelectedUpcomingId(null)}
          onStart={handleConsentStart}
        />
      )}

    </div>
  )
}
