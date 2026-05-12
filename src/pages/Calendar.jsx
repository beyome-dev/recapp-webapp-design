// src/pages/Calendar.jsx
import { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft, ChevronRight,
  Plus, SlidersHorizontal,
  Video, MapPin, Phone,
  X,
  Calendar as CalendarIcon,
  Briefcase,
  Play,
  Check,
  Ban,
  Search,
  User,
  Info,
  Pencil,
  Trash2,
  ArrowDown,
  Copy,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSessions } from '../context/SessionsContext'
import { useClients } from '../context/ClientsContext'
import ConsentModal from '../components/ConsentModal'
import './Calendar.css'

// ── Static data ───────────────────────────────────────────────────────────────
const THERAPISTS_LIST = [
  { id: 'dr-priya',  name: 'Dr. Priya S.',  colour: '#1D4ED8' },
  { id: 'dr-vikram', name: 'Dr. Vikram N.', colour: '#B45309' },
]

const ROOMS_LIST = [
  { id: 'room-1', name: 'Room 1', location: 'Chennai' },
  { id: 'room-2', name: 'Room 2', location: 'Chennai' },
]

const SERVICES = [
  { id: 'svc1', label: 'Individual Therapy (50 min)', duration: 50 },
  { id: 'svc2', label: 'Couples Therapy (80 min)',    duration: 80 },
  { id: 'svc3', label: 'Assessment (90 min)',          duration: 90 },
]


const THERAPIST_COLOUR   = { 'dr-priya': 'tc-1', 'dr-vikram': 'tc-2' }
const THERAPIST_INITIALS = { 'dr-priya': 'PS',   'dr-vikram': 'VN'   }
const THERAPIST_NAMES    = { 'dr-priya': 'Dr. Priya S.', 'dr-vikram': 'Dr. Vikram N.' }

const BLOCKED_INIT = [
  { id: 'blk1', therapistId: 'dr-priya', date: 6, startH: 9, startM: 0, duration: 60, label: '' },
]

const ATTEND_OPTIONS = [
  { value: '',                  label: '—' },
  { value: 'waiting',           label: 'Waiting' },
  { value: 'checked-in',        label: 'Checked In' },
  { value: 'no-show',           label: 'No-Show' },
  { value: 'canceled',          label: 'Canceled' },
  { value: 'late-cancel',       label: 'Late Canceled' },
  { value: 'clinician-cancel',  label: 'Clinician Canceled' },
]


const AVAILABILITY = { start: 9, end: 18 }           // 9 am–6 pm working window
const HOURS   = Array.from({ length: 24 }, (_, i) => i) // 0 (midnight) through 23
const GRID_PX = HOURS.length * 60                       // 1440 px

// ── SessionsContext ↔ Calendar format adapters ────────────────────────────────

function contextToCalSession(s, getClient) {
  const client = getClient(s.clientId)
  return {
    id:          s.id,
    client:      client?.name ?? '',
    type:        s.type,
    service:     s.service,
    duration:    s.duration,
    date:        parseInt(s.date.split('-')[2], 10),
    startH:      s.startH,
    startM:      s.startM,
    room:        s.room ?? null,
    therapistId: s.therapistId ?? null,
    meetLink:    s.meetLink ?? null,
    status:      s.status,
  }
}

function buildContextSession(calSess, clients) {
  const client = clients.find(c => c.name === calSess.client)
  const day = String(calSess.date).padStart(2, '0')
  return {
    // If the client was added locally in BookingModal but not yet in SessionsContext.CLIENTS,
    // clientId will be null. New-client persistence to context is out of scope for this prototype.
    clientId:        client?.id ?? null,
    type:            calSess.type,
    service:         calSess.service,
    duration:        calSess.duration,
    date:            `2026-05-${day}`,
    startH:          calSess.startH,
    startM:          calSess.startM,
    room:            calSess.room ?? null,
    therapistId:     calSess.therapistId ?? 'dr-priya',
    meetLink:        calSess.meetLink ?? null,
    status:          'upcoming',
    mode:            null,
    consentGiven:    null,
    recordingActive: false,
    elapsedSeconds:  0,
    noteTitle:       '',
    noteContent:     '',
    noteEnhanced:    false,
    noteLocked:      false,
    rawNoteContent:  '',
    pse:     { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sessionTop(startH, startM) { return startH * 60 + startM }
function sessionHeight(duration)    { return Math.max(duration, 30) }
function calcEndTime(startTime, duration) {
  const [h, m] = startTime.split(':').map(Number)
  const total = h * 60 + m + duration
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
}
function formatTimeRange(startH, startM, duration) {
  const endTotal = startH * 60 + startM + duration
  const endH = Math.floor(endTotal / 60)
  const endM = endTotal % 60
  const fmt = (h, m) => {
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const suffix = h < 12 ? 'am' : 'pm'
    return `${h12}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${suffix}`
  }
  return `${fmt(startH, startM)} – ${fmt(endH, endM)}`
}
function hourLabel(h) {
  if (h === 0)  return '12 am'
  if (h < 12)  return `${h} am`
  if (h === 12) return '12 pm'
  return `${h - 12} pm`
}
function calcSnap30(colOffsetY, hourIndex) {
  const minuteInHour = Math.floor((colOffsetY / 60) * 2) * 30
  return Math.min(hourIndex * 60 + minuteInHour, 23 * 60 + 30)
}
function calcSnap15(cellOffsetY, hourIndex) {
  const rawMinute = Math.round((cellOffsetY / 60) * 4) * 15
  const clampedMinute = Math.min(Math.max(rawMinute, 0), 45)
  return { hour: hourIndex, minute: clampedMinute }
}
function formatSnapTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const suffix = h < 12 ? 'am' : 'pm'
  return `${h12}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${suffix}`
}

// ── Week navigation helpers ───────────────────────────────────────────────────
const BASE_MONDAY = new Date(2026, 4, 4) // May 4, 2026
const TODAY       = new Date(2026, 4, 5) // May 5, 2026
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function getWeekDays(offset) {
  return DAY_NAMES.map((name, i) => {
    const d = new Date(BASE_MONDAY)
    d.setDate(d.getDate() + offset * 7 + i)
    return {
      name,
      date:    d.getDate(),
      month:   d.getMonth(),
      year:    d.getFullYear(),
      isToday: d.getFullYear() === TODAY.getFullYear() &&
               d.getMonth()   === TODAY.getMonth()    &&
               d.getDate()    === TODAY.getDate(),
    }
  })
}

function getWeekLabel(days) {
  const first = days[0], last = days[6]
  if (first.month === last.month) return `${MONTH_NAMES[first.month]} ${first.year}`
  return `${MONTH_NAMES[first.month]} – ${MONTH_NAMES[last.month]} ${last.year}`
}

// ── Session type icon ─────────────────────────────────────────────────────────
function SessionTypeIcon({ type, size = 11 }) {
  if (type === 'online')    return <Video size={size} />
  if (type === 'in-person') return <MapPin size={size} />
  return <Phone size={size} />
}

// ── Attendance select ─────────────────────────────────────────────────────────
function AttendanceSelect({ sessionId, attendanceState, onUpdate }) {
  const currVal = attendanceState[sessionId] || ''
  const bgMap = {
    '':                 'var(--bg-surface)',
    'waiting':          'var(--blue-50)',
    'checked-in':       'var(--green-50)',
    'no-show':          'var(--amber-50)',
    'canceled':         'var(--red-50)',
    'late-cancel':      'var(--amber-50)',
    'clinician-cancel': 'var(--red-50)',
  }
  const fgMap = {
    '':                 'var(--ink-500)',
    'waiting':          'var(--blue-700)',
    'checked-in':       'var(--green-700)',
    'no-show':          'var(--amber-700)',
    'canceled':         'var(--red-700)',
    'late-cancel':      'var(--amber-700)',
    'clinician-cancel': 'var(--red-700)',
  }
  return (
    <select
      className="cal-attendance-select"
      style={{ background: bgMap[currVal], color: fgMap[currVal] }}
      value={currVal}
      onChange={e => onUpdate(sessionId, e.target.value)}
    >
      {ATTEND_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── Filter drawer ─────────────────────────────────────────────────────────────
function FilterDrawer({ open, onClose, activeFilters, onApply }) {
  const [pending, setPending] = useState({
    therapists: activeFilters.filter(f => f.type === 'therapist').map(f => f.id),
    rooms:      activeFilters.filter(f => f.type === 'room').map(f => f.id),
  })

  useEffect(() => {
    setPending({
      therapists: activeFilters.filter(f => f.type === 'therapist').map(f => f.id),
      rooms:      activeFilters.filter(f => f.type === 'room').map(f => f.id),
    })
  }, [activeFilters, open])

  function toggle(type, id, checked) {
    setPending(prev => {
      const list = [...prev[type]]
      if (checked) { if (!list.includes(id)) list.push(id) }
      else { const i = list.indexOf(id); if (i > -1) list.splice(i, 1) }
      return { ...prev, [type]: list }
    })
  }

  function apply() {
    const filters = [
      ...pending.therapists.map(id => {
        const t = THERAPISTS_LIST.find(x => x.id === id)
        return { id, type: 'therapist', label: t ? t.name : id }
      }),
      ...pending.rooms.map(id => {
        const r = ROOMS_LIST.find(x => x.id === id)
        return { id, type: 'room', label: r ? r.name : id }
      }),
    ]
    onApply(filters)
    onClose()
  }

  return (
    <div className={`filter-drawer${open ? ' open' : ''}`}>
      <div className="filter-drawer-header">
        <span className="filter-drawer-title">Filters</span>
        <button className="modal-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="filter-section">
        <div className="filter-section-header">
          <span className="filter-section-title">Therapists</span>
          <span className="filter-select-links">
            <span className="filter-select-link" onClick={() => setPending(p => ({ ...p, therapists: THERAPISTS_LIST.map(t => t.id) }))}>Select all</span>
            <span className="filter-select-link" onClick={() => setPending(p => ({ ...p, therapists: [] }))}>Clear</span>
          </span>
        </div>
        {THERAPISTS_LIST.map(t => (
          <label className="filter-row" key={t.id}>
            <span className="colour-swatch" style={{ background: t.colour }} />
            <span className="filter-row-label">{t.name}</span>
            <input
              className="filter-checkbox"
              type="checkbox"
              checked={pending.therapists.includes(t.id)}
              onChange={e => toggle('therapists', t.id, e.target.checked)}
            />
          </label>
        ))}
      </div>
      <div className="filter-section">
        <div className="filter-section-header">
          <span className="filter-section-title">Rooms</span>
          <span className="filter-select-links">
            <span className="filter-select-link" onClick={() => setPending(p => ({ ...p, rooms: ROOMS_LIST.map(r => r.id) }))}>Select all</span>
            <span className="filter-select-link" onClick={() => setPending(p => ({ ...p, rooms: [] }))}>Clear</span>
          </span>
        </div>
        {ROOMS_LIST.map(r => (
          <label className="filter-row" key={r.id}>
            <span className="filter-row-label">{r.name} <span style={{ color: 'var(--ink-300)' }}>· {r.location}</span></span>
            <input
              className="filter-checkbox"
              type="checkbox"
              checked={pending.rooms.includes(r.id)}
              onChange={e => toggle('rooms', r.id, e.target.checked)}
            />
          </label>
        ))}
      </div>
      <div className="filter-drawer-footer">
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={apply}>
          Apply Filters
        </button>
      </div>
    </div>
  )
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({ onClose, onSchedule, onUpdate, prefillDate, prefillHour, prefillMinute, editSession }) {
  const { clients, addClient } = useClients()
  const [step, setStep] = useState(editSession ? 2 : 1)
  const [selectedClient, setSelectedClient] = useState(
    editSession
      ? { id: editSession.id, name: editSession.client, initials: editSession.client.split(' ').map(w => w[0]).join('').toUpperCase(), lastSession: '' }
      : null
  )
  const [searchText, setSearchText] = useState('')
  const searchRef = useRef(null)

  const matchedService = editSession
    ? SERVICES.find(s => s.label.startsWith(editSession.service)) || SERVICES[0]
    : null

  const [form, setForm] = useState({
    serviceId:   editSession ? (matchedService?.id || 'svc1') : 'svc1',
    date:        editSession
      ? `2026-05-${String(editSession.date).padStart(2, '0')}`
      : (prefillDate || '2026-05-04'),
    startTime:   editSession
      ? `${String(editSession.startH).padStart(2, '0')}:${String(editSession.startM).padStart(2, '0')}`
      : (prefillHour != null
          ? `${String(prefillHour).padStart(2, '0')}:${String(prefillMinute ?? 0).padStart(2, '0')}`
          : '10:00'),
    sessionType: editSession?.type || 'online',
    room:        editSession?.room || '',
    recurring:   false,
  })

  useEffect(() => {
    if (step === 1) setTimeout(() => searchRef.current?.focus(), 50)
  }, [step])

  const svc = SERVICES.find(s => s.id === form.serviceId)
  const endTime = calcEndTime(form.startTime, svc.duration)

  const q = searchText.toLowerCase()
  const filtered = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : clients
  const noResults = q && filtered.length === 0

  function selectClient(c) {
    setSelectedClient(c)
    setStep(2)
  }

  function addClientAndProceed() {
    const parts = searchText.trim().split(/\s+/)
    const firstName = parts[0] || ''
    const lastName  = parts.slice(1).join(' ')
    if (!firstName) return
    const created = addClient({ firstName, lastName })
    setSelectedClient(created)
    setStep(2)
  }

  function handleSchedule() {
    const [sh, sm] = form.startTime.split(':').map(Number)
    const dateNum = parseInt(form.date.split('-')[2], 10)
    const svc = SERVICES.find(s => s.id === form.serviceId)

    if (editSession) {
      const updated = {
        ...editSession,
        client:     selectedClient.name,
        type:       form.sessionType,
        service:    svc.label.replace(/ \(\d+ min\)/, ''),
        duration:   svc.duration,
        date:       dateNum,
        startH:     sh,
        startM:     sm,
        room:       form.sessionType === 'in-person' ? form.room : null,
        meetLink:   form.sessionType === 'online'
          ? (editSession.meetLink || 'https://meet.google.com/new-sess-link')
          : null,
      }
      onUpdate(updated)
    } else {
      const newSess = {
        id:         'sess-' + Date.now(),
        client:     selectedClient.name,
        type:       form.sessionType,
        service:    svc.label.replace(/ \(\d+ min\)/, ''),
        duration:   svc.duration,
        date:       dateNum,
        startH:     sh,
        startM:     sm,
        room:       form.sessionType === 'in-person' ? form.room : null,
        therapistId:'dr-priya',
        meetLink:   form.sessionType === 'online' ? 'https://meet.google.com/new-sess-link' : null,
      }
      onSchedule(newSess)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Step 1 — client search */}
        {step === 1 && (
          <>
            <div className="modal-header">
              <span className="modal-title">New Booking</span>
              <button className="modal-close" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="search-wrap">
                <Search size={16} />
                <input
                  ref={searchRef}
                  className="search-input"
                  type="text"
                  placeholder="Search client by name…"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </div>
              {noResults ? (
                <>
                  <p className="no-client-msg">No client found</p>
                  <div className="add-option" onClick={addClientAndProceed}>
                    <div className="add-icon"><Plus size={14} /></div>
                    <span className="add-label">Add new client, {searchText}</span>
                  </div>
                  <div className="add-option" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <div className="add-icon muted"><Plus size={14} /></div>
                    <span className="add-label muted">Save as other event</span>
                  </div>
                </>
              ) : (
                <div className="client-results">
                  {filtered.map(c => (
                    <div className="client-row" key={c.id} onClick={() => selectClient(c)}>
                      <div className="client-avatar-sm">{c.initials}</div>
                      <div className="client-info">
                        <div className="client-name">{c.name}</div>
                        <div className="client-meta">Last session: {c.lastSession}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2 — session details */}
        {step === 2 && (
          <>
            <div className="modal-header">
              <span className="modal-title">{editSession ? 'Edit Session' : 'New Booking'}</span>
              <button className="modal-close" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="client-pill">
                <User size={14} />
                {selectedClient.name}
                {!editSession && (
                  <span className="client-pill-change" onClick={() => { setSelectedClient(null); setStep(1) }}>Change</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Service Type</label>
                <select
                  className="form-input"
                  value={form.serviceId}
                  onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                >
                  {SERVICES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div className="form-row" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Start Time</label>
                  <input className="form-input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="time" value={endTime} readOnly />
              </div>

              <div className="form-group">
                <label className="form-label">Session Type</label>
                <div className="seg-toggle">
                  {['in-person', 'online', 'phone'].map(t => (
                    <button
                      key={t}
                      className={`seg-btn${form.sessionType === t ? ' active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, sessionType: t }))}
                    >
                      {t === 'in-person' ? 'In Person' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {form.sessionType === 'in-person' && (
                <div className="form-group">
                  <label className="form-label">Room</label>
                  <select className="form-input" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}>
                    <option value="">Select a room</option>
                    {ROOMS_LIST.map(r => (
                      <option key={r.id} value={r.name}>{r.name} — {r.location}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.sessionType === 'online' && (
                <div className="info-note">
                  <Info size={14} />
                  A Google Meet link will be generated automatically for this session.
                </div>
              )}

              <div className="toggle-row">
                <button
                  className={`toggle-switch${form.recurring ? ' on' : ''}`}
                  onClick={() => setForm(f => ({ ...f, recurring: !f.recurring }))}
                />
                <span className="toggle-label">
                  This session <strong>{form.recurring ? 'repeats' : 'is not recurring'}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleSchedule}>
                <Check size={14} /> {editSession ? 'Save Changes' : 'Schedule Session'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Block time modal ──────────────────────────────────────────────────────────
function BlockTimeModal({ date, hour, onClose, onSave }) {
  const dayPart = date < 10 ? '0' + date : String(date)
  const startStr = String(hour).padStart(2, '0') + ':00'
  const endStr   = calcEndTime(startStr, 60)

  const [form, setForm] = useState({
    therapistId: 'dr-priya',
    date: `2026-05-${dayPart}`,
    start: startStr,
    end: endStr,
    label: '',
  })

  function handleSave() {
    const [sh, sm] = form.start.split(':').map(Number)
    const [eh, em] = form.end.split(':').map(Number)
    const duration = Math.max((eh * 60 + em) - (sh * 60 + sm), 30)
    onSave({
      id: 'blk-' + Date.now(),
      therapistId: form.therapistId,
      date: parseInt(form.date.split('-')[2], 10),
      startH: sh,
      startM: sm,
      duration,
      label: form.label,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Block Time</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Therapist</label>
            <select className="form-input" value={form.therapistId} onChange={e => setForm(f => ({ ...f, therapistId: e.target.value }))}>
              {THERAPISTS_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Time</label>
              <input className="form-input" type="time" value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value, end: calcEndTime(e.target.value, 60) }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Time</label>
              <input className="form-input" type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label">Label (optional)</label>
            <input className="form-input" type="text" placeholder="e.g. Lunch, Out of office"
              value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            <Ban size={14} /> Save Block
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session detail modal ──────────────────────────────────────────────────────
function SessionModal({ session, role, attendanceState, onUpdateAttendance, onEdit, onDelete, onClose, onStartSession }) {
  const s = session
  const isMgmt = role === 'Admin' || role === 'Staff'
  const timeStr = formatTimeRange(s.startH, s.startM, s.duration)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayName = dayNames[(s.date - 4 + 7) % 7] || ''
  const dateStr = `${dayName}, ${s.date} May 2026`
  const pillClass = s.type === 'online' ? 'pill-online' : s.type === 'in-person' ? 'pill-in-person' : 'pill-phone'
  const pillLabel = s.type === 'online' ? 'Online' : s.type === 'in-person' ? 'In Person' : 'Phone'
  const bannerClass = s.type === 'online' ? 'session-modal-banner--online' : s.type === 'in-person' ? 'session-modal-banner--in-person' : 'session-modal-banner--phone'
  const initials = s.client.split(' ').map(w => w[0]).join('').toUpperCase()
  const isToday = s.date === TODAY.getDate()
  const canStart = role === 'Therapist' && (s.type === 'online' || isToday) && s.status === 'upcoming'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal session-modal" onClick={e => e.stopPropagation()}>

        {/* Banner header */}
        <div className={`session-modal-banner ${bannerClass}`}>
          <div className="session-client-avatar">{initials}</div>
          <div className="session-client-info">
            <div className="session-client-name">{s.client}</div>
            <span className={`session-type-pill ${pillClass}`}>
              <SessionTypeIcon type={s.type} size={11} />
              {pillLabel}
            </span>
          </div>
          <div className="session-modal-banner-actions">
            <button className="modal-icon-btn" title="Edit session" onClick={() => onEdit(s)}>
              <Pencil size={15} />
            </button>
            <button className="modal-icon-btn modal-icon-btn--destructive" title="Cancel session" onClick={() => onDelete(s.id)}>
              <Trash2 size={15} />
            </button>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="session-modal-body">

          {/* Group 1 — When & What */}
          <div className="session-detail-group">
            <div className="session-detail-row">
              <span className="session-detail-icon"><CalendarIcon size={16} /></span>
              <span className="session-detail-text"><strong>{dateStr}</strong> · {timeStr}</span>
            </div>
            <div className="session-detail-row">
              <span className="session-detail-icon"><Briefcase size={16} /></span>
              <span className="session-detail-text">{s.service} · {s.duration} min</span>
            </div>
            {s.room && (
              <div className="session-detail-row">
                <span className="session-detail-icon"><MapPin size={16} /></span>
                <span className="session-detail-text">{s.room}</span>
              </div>
            )}
            {isMgmt && (
              <div className="session-detail-row">
                <span className="session-detail-icon"><User size={16} /></span>
                <span className="session-detail-text">Dr. Priya S.</span>
              </div>
            )}
            {s.type === 'online' && s.meetLink && (
              <>
                <div className="session-detail-row">
                  <span className="session-detail-icon"><Video size={16} /></span>
                  <span className="session-meet-link">{s.meetLink}</span>
                </div>
                <button
                  className="btn-join-meeting"
                  onClick={() => window.open(s.meetLink, '_blank')}
                >
                  <Video size={14} /> Join Meeting
                </button>
              </>
            )}
          </div>

          {/* Group 2 — Attendance */}
          <div className="session-detail-group">
            <div className="attendance-field-label">Attendance</div>
            <AttendanceSelect
              sessionId={s.id}
              attendanceState={attendanceState}
              onUpdate={onUpdateAttendance}
            />
          </div>

        </div>

        {/* Start Session footer */}
        {role === 'Therapist' && (
          <div className="session-modal-footer">
            <button
              className="btn-start-full"
              disabled={!canStart}
              title={canStart ? '' : 'Available on the day of the session'}
              onClick={canStart ? onStartSession : undefined}
            >
              <Play size={16} /> Start Session
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Cell popover ──────────────────────────────────────────────────────────────
function CellPopover({ x, y, onNewSession, onBlockTime, onClose }) {
  useEffect(() => {
    function handleClick() { onClose() }
    const t = setTimeout(() => document.addEventListener('click', handleClick, { once: true }), 0)
    return () => { clearTimeout(t); document.removeEventListener('click', handleClick) }
  }, [onClose])

  return (
    <div className="cell-popover" style={{ left: x, top: y }} onClick={e => e.stopPropagation()}>
      <div className="popover-item" onClick={() => { onClose(); onNewSession() }}>
        <Plus size={14} /> New booking
      </div>
      <hr className="popover-divider" />
      <div className="popover-item" onClick={() => { onClose(); onBlockTime() }}>
        <Ban size={14} /> Block time
      </div>
    </div>
  )
}

// ── Week view ─────────────────────────────────────────────────────────────────
function WeekView({ sessions, blockedSlots, weekDays, role, dragSessionId, onDragStart, onDragEnd, onSessionDrop, onCellClick, onSessionClick, onBlockedClick }) {
  const isMgmt = role === 'Admin' || role === 'Staff'
  const [ghostSnap, setGhostSnap] = useState(null) // { date, totalMinutes }
  const [dragOverSnap, setDragOverSnap] = useState(null) // { date, hour, minute }

  return (
    <div className="week-grid-outer">
      {/* Header row */}
      <div className="week-header-time" />
      {weekDays.map(d => (
        <div className="week-header-day" key={d.date}>
          <div className="week-header-day-name">{d.name}</div>
          <div className={`week-header-date${d.isToday ? ' today' : ''}`}>{d.date}</div>
        </div>
      ))}

      {/* Time column + day columns */}
      <div className="week-time-col">
        {HOURS.map(h => (
          <div className="week-time-label" key={h}>{hourLabel(h)}</div>
        ))}
      </div>

      {weekDays.map((d, di) => {
        const daySessions = sessions.filter(s => s.date === d.date)
        const dayBlocked  = isMgmt ? blockedSlots.filter(b => b.date === d.date) : []
        const ghost = ghostSnap?.date === d.date ? ghostSnap : null

        return (
          <div
            key={d.date}
            className={`week-day-col${d.isToday ? ' today-col' : ''}`}
            style={{ height: GRID_PX }}
            onMouseMove={e => {
              if (dragSessionId) return
              const rect = e.currentTarget.getBoundingClientRect()
              const colY = e.clientY - rect.top
              const hourIndex = Math.floor(colY / 60)
              const snapped = calcSnap30(colY % 60, hourIndex)
              setGhostSnap({ date: d.date, totalMinutes: snapped })
            }}
            onMouseLeave={() => setGhostSnap(null)}
          >
            {HOURS.map(h => (
              <div
                key={h}
                className={`week-cell${(h < AVAILABILITY.start || h >= AVAILABILITY.end) ? ' off-hours' : ''}`}
                onClick={() => {
                  setGhostSnap(null)
                  const snapH = ghostSnap?.date === d.date
                    ? Math.floor(ghostSnap.totalMinutes / 60)
                    : h
                  const snapM = ghostSnap?.date === d.date
                    ? ghostSnap.totalMinutes % 60
                    : 0
                  onCellClick(d.date, snapH, snapM, di)
                }}
                onDragOver={e => {
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const cellOffsetY = e.clientY - rect.top
                  const { hour: snapH, minute: snapM } = calcSnap15(cellOffsetY, h)
                  setDragOverSnap({ date: d.date, hour: snapH, minute: snapM })
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverSnap(null)
                  }
                }}
                onDrop={e => {
                  e.preventDefault()
                  setDragOverSnap(null)
                  const id = e.dataTransfer.getData('text/plain')
                  const snapM = dragOverSnap?.date === d.date && dragOverSnap?.hour === h
                    ? dragOverSnap.minute
                    : 0
                  if (id) onSessionDrop(id, d.date, h, snapM)
                }}
              />
            ))}
            {dayBlocked.map(b => (
              <div
                key={b.id}
                className="blocked-slot"
                style={{ top: sessionTop(b.startH, b.startM), height: sessionHeight(b.duration) }}
                onClick={e => { e.stopPropagation(); onBlockedClick(b.id) }}
              />
            ))}
            {ghost && (
              <div
                className="ghost-slot"
                style={{ top: ghost.totalMinutes }}
              >
                <Plus size={11} color="var(--green-700)" />
                <span className="ghost-slot-label">
                  New booking · {formatSnapTime(ghost.totalMinutes)}
                </span>
              </div>
            )}
            {dragOverSnap?.date === d.date && (
              <div
                className="drag-snap-bar"
                style={{ top: dragOverSnap.hour * 60 + dragOverSnap.minute }}
              />
            )}
            {daySessions.map(s => {
              const blockClass = isMgmt ? (THERAPIST_COLOUR[s.therapistId] || 'tc-1') : 'therapist-session'
              return (
                <div
                  key={s.id}
                  className={`session-block ${blockClass}${dragSessionId === s.id ? ' dragging' : ''}`}
                  style={{ top: sessionTop(s.startH, s.startM), height: sessionHeight(s.duration) }}
                  draggable={!s._readOnly}
                  onDragStart={!s._readOnly ? (e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); onDragStart(s.id) }) : undefined}
                  onDragEnd={!s._readOnly ? (() => { onDragEnd(); setDragOverSnap(null) }) : undefined}
                  onClick={e => { e.stopPropagation(); onSessionClick(s.id) }}
                >
                  <div className="session-block-type-icon">
                    <SessionTypeIcon type={s.type} size={10} />
                  </div>
                  <div className="session-block-name">{s.client}</div>
                  <div className="session-block-time">{formatTimeRange(s.startH, s.startM, s.duration)}</div>
                  {isMgmt && s.therapistId && (
                    <div className="therapist-tag">
                      <div className="therapist-initials-badge">
                        <span>{THERAPIST_INITIALS[s.therapistId] || '?'}</span>
                      </div>
                      <span className="therapist-tag-name">{THERAPIST_NAMES[s.therapistId] || ''}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Day view ──────────────────────────────────────────────────────────────────
function DayView({ sessions, weekDays, role, dragSessionId, onDragStart, onDragEnd, onSessionDrop, onCellClick, onSessionClick }) {
  const d = weekDays[0]
  const isMgmt = role === 'Admin' || role === 'Staff'
  const daySessions = sessions.filter(s => s.date === d.date)
  const [ghostSnap, setGhostSnap] = useState(null) // { totalMinutes }
  const [dragOverSnap, setDragOverSnap] = useState(null) // { hour, minute }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', minWidth: 400 }}>
      <div style={{ borderBottom: 'var(--border-default)', background: 'var(--bg-surface)', padding: 'var(--space-3) var(--space-2)', textAlign: 'right' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-300)' }}>All day</span>
      </div>
      <div style={{ borderBottom: 'var(--border-default)', background: 'var(--bg-surface)', padding: 'var(--space-3)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{d.name} {d.date} May 2026</span>
      </div>
      <div className="week-time-col">
        {HOURS.map(h => <div className="week-time-label" key={h}>{hourLabel(h)}</div>)}
      </div>
      <div
        className="week-day-col"
        style={{ height: GRID_PX }}
        onMouseMove={e => {
          if (dragSessionId) return
          const rect = e.currentTarget.getBoundingClientRect()
          const colY = e.clientY - rect.top
          const hourIndex = Math.floor(colY / 60)
          setGhostSnap({ totalMinutes: calcSnap30(colY % 60, hourIndex) })
        }}
        onMouseLeave={() => setGhostSnap(null)}
      >
        {HOURS.map(h => (
          <div
            key={h}
            className={`week-cell${(h < AVAILABILITY.start || h >= AVAILABILITY.end) ? ' off-hours' : ''}`}
            onClick={() => {
              setGhostSnap(null)
              const snapH = ghostSnap ? Math.floor(ghostSnap.totalMinutes / 60) : h
              const snapM = ghostSnap ? ghostSnap.totalMinutes % 60 : 0
              onCellClick(d.date, snapH, snapM, 0)
            }}
            onDragOver={e => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const { hour: snapH, minute: snapM } = calcSnap15(e.clientY - rect.top, h)
              setDragOverSnap({ hour: snapH, minute: snapM })
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSnap(null)
            }}
            onDrop={e => {
              e.preventDefault()
              setDragOverSnap(null)
              const id = e.dataTransfer.getData('text/plain')
              const snapM = dragOverSnap?.hour === h ? dragOverSnap.minute : 0
              if (id) onSessionDrop(id, d.date, h, snapM)
            }}
          />
        ))}
        {ghostSnap && (
          <div className="ghost-slot" style={{ top: ghostSnap.totalMinutes }}>
            <Plus size={11} color="var(--green-700)" />
            <span className="ghost-slot-label">New booking · {formatSnapTime(ghostSnap.totalMinutes)}</span>
          </div>
        )}
        {dragOverSnap && (
          <div
            className="drag-snap-bar"
            style={{ top: dragOverSnap.hour * 60 + dragOverSnap.minute }}
          />
        )}
        {daySessions.map(s => {
          const blockClass = isMgmt ? (THERAPIST_COLOUR[s.therapistId] || 'tc-1') : 'therapist-session'
          return (
            <div
              key={s.id}
              className={`session-block ${blockClass}${dragSessionId === s.id ? ' dragging' : ''}`}
              style={{ top: sessionTop(s.startH, s.startM), height: sessionHeight(s.duration) }}
              draggable={!s._readOnly}
              onDragStart={!s._readOnly ? (e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); onDragStart(s.id) }) : undefined}
              onDragEnd={!s._readOnly ? (() => { onDragEnd(); setDragOverSnap(null) }) : undefined}
              onClick={e => { e.stopPropagation(); onSessionClick(s.id) }}
            >
              <div className="session-block-type-icon">
                <SessionTypeIcon type={s.type} size={10} />
              </div>
              <div className="session-block-name">{s.client}</div>
              <div className="session-block-time">{formatTimeRange(s.startH, s.startM, s.duration)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({ sessions, onDayClick }) {
  const countByDate = {}
  sessions.forEach(s => { countByDate[s.date] = (countByDate[s.date] || 0) + 1 })

  const leadingBlanks = 4 // May 2026: May 1 = Friday → Mon=0..Thu=3 → 4 leading
  const cells = []
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(
      <div className="month-day-cell other-month" key={`lead-${i}`}>
        <span className="month-day-num">{27 + i}</span>
      </div>
    )
  }
  for (let day = 1; day <= 31; day++) {
    const isToday = day === 5
    const count = countByDate[day] || 0
    cells.push(
      <div className="month-day-cell" key={day} onClick={() => onDayClick(day)}>
        <span className={`month-day-num${isToday ? ' today' : ''}`}>{day}</span>
        {count > 0 && (
          <div><span className="session-count-pill">{count} session{count > 1 ? 's' : ''}</span></div>
        )}
      </div>
    )
  }
  const total = leadingBlanks + 31
  const trailing = (7 - (total % 7)) % 7
  for (let i = 1; i <= trailing; i++) {
    cells.push(
      <div className="month-day-cell other-month" key={`trail-${i}`}>
        <span className="month-day-num">{i}</span>
      </div>
    )
  }

  return (
    <div className="month-grid">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
        <div className="month-header-cell" key={d}>{d}</div>
      ))}
      {cells}
    </div>
  )
}

// ── Reschedule modal ──────────────────────────────────────────────────────────
function RescheduleModal({ pending, sessions, onConfirm, onCancel }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  const s = sessions.find(x => x.id === pending.sessionId)
  if (!s) return null

  const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  function dateLabel(date, h, m) {
    const dayIdx = (date - 4 + 7) % 7
    const dayFull = DAY_NAMES_FULL[dayIdx] || ''
    const timeFmt = formatTimeRange(h, m, 0).split('–')[0].trim()
    return { day: `${dayFull}, ${date} May 2026`, time: timeFmt }
  }

  const from = dateLabel(pending.fromDate, pending.fromStartH, pending.fromStartM)
  const to   = dateLabel(pending.toDate,   pending.toStartH,   pending.toStartM)

  function buildCopyText() {
    const lines = [
      'Session rescheduled',
      `Client: ${s.client}`,
      `Date: ${to.day} · ${to.time}`,
      `Duration: ${s.duration} min · ${s.service}`,
    ]
    if (s.type === 'online' && s.meetLink) lines.push(`Meet: ${s.meetLink}`)
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildCopyText()).then(() => setCopied(true))
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal reschedule-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span className="modal-title">Reschedule session?</span>
          <button className="modal-close" onClick={onCancel}><X size={16} /></button>
        </div>

        <div className="modal-body">

          {/* From → To card */}
          <div className="from-to-card">
            <div className="from-to-row from-to-row--from">
              <span className="from-to-label">From</span>
              <CalendarIcon size={14} />
              <span className="from-to-date from-to-date--strikethrough">{from.day}</span>
              <span className="from-to-time">{from.time}</span>
            </div>
            <div className="from-to-arrow">
              <ArrowDown size={14} />
            </div>
            <div className="from-to-row from-to-row--to">
              <span className="from-to-label">To</span>
              <CalendarIcon size={14} />
              <span className="from-to-date">{to.day}</span>
              <span className="from-to-time">{to.time}</span>
            </div>
          </div>

          {/* Session info + copy */}
          <div className="session-info-copy-block">
            <button
              className={`copy-btn${copied ? ' copy-btn--copied' : ''}`}
              onClick={handleCopy}
            >
              <Copy size={11} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <div className="session-info-row">
              <span className="session-info-row-label">Client</span>
              <span>{s.client}</span>
            </div>
            <div className="session-info-row">
              <span className="session-info-row-label">Duration</span>
              <span>{s.duration} min · {s.service}</span>
            </div>
            <div className="session-info-row">
              <span className="session-info-row-label">Type</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SessionTypeIcon type={s.type} size={13} />
                {s.type === 'online' ? 'Online' : s.type === 'in-person' ? 'In Person' : 'Phone'}
              </span>
            </div>
            {s.type === 'online' && s.meetLink && (
              <div className="session-info-row">
                <span className="session-info-row-label">Meet</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ink-500)' }}>{s.meetLink}</span>
              </div>
            )}
          </div>

        </div>

        <div className="reschedule-modal-footer">
          <button className="btn-secondary" onClick={() => onConfirm('manual')}>
            I'll send manually
          </button>
          <button className="btn-primary" onClick={() => onConfirm('notify')}>
            <Check size={14} /> Send notification
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Calendar page ─────────────────────────────────────────────────────────────
export default function Calendar() {
  const { user } = useAuth()
  const role = user?.role || 'Therapist'
  const isMgmt = role === 'Admin' || role === 'Staff'

  const { sessions: ctxSessions, addSession, updateSession, deleteSession } = useSessions()
  const { clients, getClient } = useClients()
  const navigate = useNavigate()

  // Derive Calendar-format sessions from context
  const sessions = ctxSessions.map(s => contextToCalSession(s, getClient))

  const [currentView, setCurrentView] = useState('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDays = getWeekDays(weekOffset)
  const [blockedSlots, setBlockedSlots] = useState(BLOCKED_INIT)
  const [activeFilters, setActiveFilters] = useState([])
  const [attendanceState, setAttendanceState] = useState({})
  const [dragSessionId, setDragSessionId] = useState(null)

  // Modal state
  const [bookingSlot, setBookingSlot] = useState(null) // null = closed; { date, hour } or true for no slot
  const [blockSlot, setBlockSlot] = useState(null)
  const [openSessionId, setOpenSessionId] = useState(null)
  const [editingSession, setEditingSession] = useState(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [cellPopover, setCellPopover] = useState(null) // { x, y, date, hour, minute, dayIdx }
  const [pendingReschedule, setPendingReschedule] = useState(null)
  const [consentSession, setConsentSession] = useState(null) // Calendar-format session for consent

  const calBodyRef = useRef(null)

  useEffect(() => {
    if (calBodyRef.current) {
      calBodyRef.current.scrollTop = 8 * 60 // scroll to 8 am (8 hours × 60px)
    }
  }, [])

  // Period label
  const periodLabel = currentView === 'day'
    ? `${weekDays[0].name} ${weekDays[0].date} ${MONTH_NAMES[weekDays[0].month]} ${weekDays[0].year}`
    : getWeekLabel(weekDays)

  // Derive visible sessions
  function getVisibleSessions() {
    // Therapists only see their own sessions. Admins and Staff see all.
    const allSessions = isMgmt
      ? sessions
      : sessions.filter(s => !s.therapistId || s.therapistId === 'dr-priya')

    const activeTIds     = activeFilters.filter(f => f.type === 'therapist').map(f => f.id)
    const activeRIds     = activeFilters.filter(f => f.type === 'room').map(f => f.id)
    const activeRoomNames = activeRIds.map(id => {
      const r = ROOMS_LIST.find(x => x.id === id)
      return r ? r.name : id
    })

    return allSessions.filter(s => {
      const therapistOk = activeTIds.length === 0 || activeTIds.includes(s.therapistId)
      const roomOk      = activeRoomNames.length === 0 || activeRoomNames.includes(s.room)
      return therapistOk && roomOk
    })
  }

  function getAllSessionsById(id) {
    return sessions.find(s => s.id === id)
  }

  function handleCellClick(date, hour, minute, dayIdx) {
    if (role === 'Admin') {
      const colWidth = (window.innerWidth - 220 - 60) / 7
      const x = Math.min(220 + 60 + dayIdx * colWidth + colWidth * 0.2, window.innerWidth - 180)
      const y = Math.min(130 + hour * 60 + 30, window.innerHeight - 120)
      setCellPopover({ x, y, date, hour, minute })
    } else {
      setBookingSlot({ date, hour, minute })
    }
  }

  function handleUpdateAttendance(sessionId, value) {
    setAttendanceState(prev => ({ ...prev, [sessionId]: value }))
  }

  function handleScheduleSession(newCalSess) {
    addSession(buildContextSession(newCalSess, clients))
  }

  function handleSaveBlock(block) {
    setBlockedSlots(prev => [...prev, block])
  }

  function handleRemoveBlock(id) {
    setBlockedSlots(prev => prev.filter(b => b.id !== id))
  }

  function handleEditSession(updatedCalSess) {
    const client = clients.find(c => c.name === updatedCalSess.client)
    const day = String(updatedCalSess.date).padStart(2, '0')
    updateSession(updatedCalSess.id, {
      clientId: client?.id,
      type:     updatedCalSess.type,
      service:  updatedCalSess.service,
      duration: updatedCalSess.duration,
      date:     `2026-05-${day}`,
      startH:   updatedCalSess.startH,
      startM:   updatedCalSess.startM,
      room:     updatedCalSess.room ?? null,
      meetLink: updatedCalSess.meetLink ?? null,
    })
    setEditingSession(null)
  }

  function handleSessionDrop(sessionId, date, hour, minute) {
    if (pendingReschedule) return  // ignore drops while confirmation is open
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    // prototype: May 2026 only — date is a Calendar day-number (integer)
    const dateStr = `2026-05-${String(date).padStart(2, '0')}`

    if (session.date !== date) {
      // Optimistic update and confirmation modal are both batched in React 19,
      // so setPendingReschedule (the lock) and updateSession land in the same commit.
      updateSession(sessionId, { date: dateStr, startH: hour, startM: minute })
      setPendingReschedule({
        sessionId,
        fromDate:   session.date,
        fromStartH: session.startH,
        fromStartM: session.startM,
        toDate:     date,
        toStartH:   hour,
        toStartM:   minute,
      })
    } else {
      // Same-date time change — commit silently
      updateSession(sessionId, { startH: hour, startM: minute })
    }
    setDragSessionId(null)
  }

  function handleRescheduleConfirm(mode) {
    // Both modes commit (modal + notify simulation); just close
    setPendingReschedule(null)
  }

  function handleRescheduleCancel() {
    if (pendingReschedule) {
      const fromDateStr = `2026-05-${String(pendingReschedule.fromDate).padStart(2, '0')}` // prototype: May 2026 only
      updateSession(pendingReschedule.sessionId, {
        date:   fromDateStr,
        startH: pendingReschedule.fromStartH,
        startM: pendingReschedule.fromStartM,
      })
    }
    setPendingReschedule(null)
  }

  const visibleSessions = getVisibleSessions()
  const openSession = openSessionId ? getAllSessionsById(openSessionId) : null

  const consentCtxSession = consentSession
    ? ctxSessions.find(s => s.id === consentSession.id)
    : null
  const consentClient = consentCtxSession ? getClient(consentCtxSession.clientId) : null

  return (
    <div className="cal-page">
      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-period">
          <span className="cal-period-label">{periodLabel}</span>
          <button className="cal-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft size={14} />
          </button>
          <button className="cal-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>
            <ChevronRight size={14} />
          </button>
          <button className="today-btn" onClick={() => setWeekOffset(0)}>Today</button>
        </div>
        <div className="view-toggle">
          {['day', 'week', 'month'].map(v => (
            <button
              key={v}
              className={`view-btn${currentView === v ? ' active' : ''}`}
              onClick={() => setCurrentView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          {isMgmt && (
            <button className="btn-ghost" onClick={() => setFilterDrawerOpen(true)}>
              <SlidersHorizontal size={14} /> Filters
            </button>
          )}
          <button className="btn-primary" onClick={() => setBookingSlot(true)}>
            <Plus size={14} /> New Booking
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {isMgmt && activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map(f => (
            <div className="filter-chip" key={f.id}>
              {f.label}
              <button
                className="filter-chip-remove"
                onClick={() => setActiveFilters(prev => prev.filter(x => x.id !== f.id))}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Calendar body */}
      <div className="cal-body" ref={calBodyRef}>
        {currentView === 'week' && (
          <WeekView
            sessions={visibleSessions}
            blockedSlots={blockedSlots}
            weekDays={weekDays}
            role={role}
            dragSessionId={dragSessionId}
            onDragStart={id => setDragSessionId(id)}
            onDragEnd={() => setDragSessionId(null)}
            onSessionDrop={handleSessionDrop}
            onCellClick={handleCellClick}
            onSessionClick={id => setOpenSessionId(id)}
            onBlockedClick={id => {
              const blk = blockedSlots.find(b => b.id === id)
              if (blk) handleRemoveBlock(id)
            }}
          />
        )}
        {currentView === 'day' && (
          <DayView
            sessions={visibleSessions}
            weekDays={weekDays}
            role={role}
            dragSessionId={dragSessionId}
            onDragStart={id => setDragSessionId(id)}
            onDragEnd={() => setDragSessionId(null)}
            onSessionDrop={handleSessionDrop}
            onCellClick={handleCellClick}
            onSessionClick={id => setOpenSessionId(id)}
          />
        )}
        {currentView === 'month' && (
          <MonthView
            sessions={visibleSessions}
            onDayClick={() => setCurrentView('day')}
          />
        )}
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        activeFilters={activeFilters}
        onApply={setActiveFilters}
      />

      {/* Booking modal */}
      {(bookingSlot !== null || editingSession !== null) && (
        <BookingModal
          onClose={() => { setBookingSlot(null); setEditingSession(null) }}
          onSchedule={handleScheduleSession}
          onUpdate={handleEditSession}
          prefillDate={bookingSlot?.date ? `2026-05-${String(bookingSlot.date).padStart(2, '0')}` : null}
          prefillHour={bookingSlot?.hour ?? null}
          prefillMinute={bookingSlot?.minute ?? null}
          editSession={editingSession}
        />
      )}

      {/* Block time modal */}
      {blockSlot && (
        <BlockTimeModal
          date={blockSlot.date}
          hour={blockSlot.hour}
          onClose={() => setBlockSlot(null)}
          onSave={handleSaveBlock}
        />
      )}

      {/* Session detail modal */}
      {openSession && (
        <SessionModal
          session={openSession}
          role={role}
          attendanceState={attendanceState}
          onUpdateAttendance={handleUpdateAttendance}
          onEdit={s => { setEditingSession(s); setOpenSessionId(null) }}
          onDelete={id => { deleteSession(id); setOpenSessionId(null) }}
          onClose={() => setOpenSessionId(null)}
          onStartSession={() => {
            setConsentSession(openSession)
            setOpenSessionId(null)
          }}
        />
      )}

      {/* Reschedule confirmation modal */}
      {pendingReschedule && (
        <RescheduleModal
          pending={pendingReschedule}
          sessions={sessions}
          onConfirm={handleRescheduleConfirm}
          onCancel={handleRescheduleCancel}
        />
      )}

      {/* Cell popover (admin only) */}
      {cellPopover && (
        <CellPopover
          x={cellPopover.x}
          y={cellPopover.y}
          onNewSession={() => setBookingSlot({ date: cellPopover.date, hour: cellPopover.hour, minute: cellPopover.minute ?? 0 })}
          onBlockTime={() => setBlockSlot({ date: cellPopover.date, hour: cellPopover.hour })}
          onClose={() => setCellPopover(null)}
        />
      )}

      {/* Consent modal — triggered by Start Session in SessionModal */}
      {consentCtxSession && consentClient && (
        <ConsentModal
          session={consentCtxSession}
          client={consentClient}
          onClose={() => setConsentSession(null)}
          onStart={consentGiven => {
            updateSession(consentCtxSession.id, {
              status:          'in-progress',
              mode:            consentGiven ? 'ai-scribe' : 'handwritten',
              consentGiven,
              recordingActive: consentGiven,
            })
            setConsentSession(null)
            navigate(`/sessions/${consentCtxSession.id}/active`)
          }}
        />
      )}
    </div>
  )
}
