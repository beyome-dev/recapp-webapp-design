// src/pages/ActiveSession.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Video, MapPin, Phone, Pause, Mic, MicOff, Square, Circle } from 'lucide-react'
import { useSessions } from '../context/SessionsContext'
import { useClients } from '../context/ClientsContext'
import PSEOverlay from '../components/PSEOverlay'
import './ActiveSession.css'

const TYPE_LABEL = { online: 'Online', 'in-person': 'In-person', phone: 'Phone' }
const TYPE_ICON  = { online: Video, 'in-person': MapPin, phone: Phone }

function formatTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = n => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function formatMeta(date, h, m) {
  const d    = new Date(date)
  const day  = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const hh   = h % 12 || 12
  const mm   = String(m).padStart(2, '0')
  const ampm = h < 12 ? 'am' : 'pm'
  return `${day} · ${hh}:${mm} ${ampm}`
}

const WAVE_DELAYS = ['0s', '0.1s', '0.2s', '0.15s', '0.05s', '0.25s', '0.1s']

export default function ActiveSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sessions, getSessionNumber, updateSession } = useSessions()
  const { getClient } = useClients()

  const session = sessions.find(s => s.id === id)
  const client  = session ? getClient(session.clientId) : null
  const sessNum = session ? getSessionNumber(session.clientId, id) : 0

  const isAI = session?.mode === 'ai-scribe'

  const [elapsed,          setElapsed]          = useState(session?.elapsedSeconds ?? 0)
  const [recording,        setRecording]         = useState(session?.recordingActive ?? false)
  const [noteContent,      setNoteContent]       = useState(session?.noteContent ?? '')
  const [showPSE,          setShowPSE]           = useState(false)
  const [showResumeToast,  setShowResumeToast]   = useState(() => (session?.elapsedSeconds ?? 0) > 0)

  const intervalRef  = useRef(null)
  const elapsedRef   = useRef(elapsed)
  const noteRef      = useRef(noteContent)
  const recordingRef = useRef(recording)

  useEffect(() => { elapsedRef.current = elapsed },    [elapsed])
  useEffect(() => { noteRef.current = noteContent },    [noteContent])
  useEffect(() => { recordingRef.current = recording }, [recording])

  // Timer
  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  // Auto-save on unmount (replaces useBlocker — incompatible with BrowserRouter)
  useEffect(() => {
    return () => saveState({ recording: false, status: 'paused' })
  }, [])

  // Auto-pause on tab hide
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        saveState({ recording: false, status: 'paused' })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Resume toast — dismiss after 3 s
  useEffect(() => {
    if (!showResumeToast) return
    const t = setTimeout(() => setShowResumeToast(false), 3000)
    return () => clearTimeout(t)
  }, [showResumeToast])

  function saveState(opts = {}) {
    updateSession(id, {
      elapsedSeconds:  opts.elapsed   ?? elapsedRef.current,
      noteContent:     opts.note      ?? noteRef.current,
      recordingActive: opts.recording ?? recordingRef.current,
      status:          opts.status    ?? 'in-progress',
    })
  }

  function handleEndSession() {
    clearInterval(intervalRef.current)
    saveState({ recording: false, status: 'completed' })
    setShowPSE(true)
  }

  function handlePSEDone() {
    navigate(`/sessions/${id}/notes`)
  }

  if (!session) return <div className="as-not-found">Session not found.</div>

  const TypeIcon = TYPE_ICON[session.type] ?? Video

  return (
    <div className="as-page">

      {/* Header */}
      <div className="as-header">
        <div className="as-client-row">
          <div className="as-avatar" style={{ background: client?.colour }}>
            {client?.initials}
          </div>
          <h1 className="as-client-name">{client?.name}</h1>
        </div>
        <div className="as-chips">
          <span className="as-chip as-chip-green">Session #{sessNum}</span>
          <span className="as-chip as-chip-blue">{session.service}</span>
          <span className="as-chip as-chip-neutral">
            <TypeIcon size={11} />
            {TYPE_LABEL[session.type]}
          </span>
          <span className="as-chip as-chip-amber">
            {formatMeta(session.date, session.startH, session.startM)}
          </span>
        </div>
      </div>

      {/* Writing canvas */}
      <div className="as-canvas">
        <div className="as-note-title">
          {session.noteTitle || `Session with ${client?.name}`}
        </div>
        <textarea
          className="as-textarea"
          placeholder="Start writing your notes…"
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          onBlur={() => saveState()}
        />
      </div>

      {/* Floating pill bar */}
      <div className="as-pill">
        <span className="as-timer">{formatTime(elapsed)}</span>

        <div className="as-divider" />

        <div className="as-waveform">
          {WAVE_DELAYS.map((delay, i) => (
            <div
              key={i}
              className={`as-wave-bar ${isAI ? 'as-wb-active' : 'as-wb-off'}`}
              style={isAI ? { animationDelay: delay } : undefined}
            />
          ))}
        </div>

        <div className="as-rec-wrap">
          {isAI && recording && <span className="as-rec-dot" />}
          <button
            className={`as-rec-btn ${isAI ? (recording ? 'as-rec-recording' : 'as-rec-ai') : 'as-rec-muted'}`}
            disabled={!isAI}
            onClick={() => {
              if (!isAI) return
              const next = !recording
              setRecording(next)
              saveState({ recording: next })
            }}
            title={isAI ? (recording ? 'Pause recording' : 'Start recording') : 'Recording unavailable'}
          >
            {isAI
              ? (recording ? <Pause size={15} /> : <Mic size={15} />)
              : <MicOff size={15} />
            }
          </button>
        </div>

        <div className="as-divider" />

        <button className="as-end-btn" onClick={handleEndSession}>
          <Square size={13} />
          End Session
        </button>
      </div>

      {/* Resume toast */}
      {showResumeToast && (
        <div className="as-toast">
          Session resumed — notes restored
        </div>
      )}

      {showPSE && (
        <PSEOverlay
          session={session}
          client={client}
          onDone={handlePSEDone}
          onSkip={handlePSEDone}
        />
      )}
    </div>
  )
}
