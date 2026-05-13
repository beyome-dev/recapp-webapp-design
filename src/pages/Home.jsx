// src/pages/Home.jsx
import { useState } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSessions } from '../context/SessionsContext'
import { useClients } from '../context/ClientsContext'
import ConsentModal from '../components/ConsentModal'
import upcomingEmptyImg from '../assets/upcoming_empty.png'
import './Home.css'

const ROLE_CONTENT = {
  Therapist: {
    greeting: 'Good morning',
    subtitle: "Here's your schedule for today.",
  },
  Admin: {
    greeting: 'Organisation overview',
    subtitle: 'All therapists · all sessions · today.',
  },
  Staff: {
    greeting: 'Good morning',
    subtitle: 'Sessions assigned to you today.',
  },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ── Attendance select ──────────────────────────────────────────────────────────
const ATTEND_OPTIONS = [
  { value: '',                 label: '–' },
  { value: 'waiting',          label: 'Waiting' },
  { value: 'checked-in',       label: 'Checked In' },
  { value: 'no-show',          label: 'No-Show' },
  { value: 'canceled',         label: 'Canceled' },
  { value: 'late-canceled',    label: 'Late Canceled' },
  { value: 'clinician-canceled', label: 'Clinician Canceled' },
]

function AttendanceSelect() {
  const [status, setStatus] = useState('')
  return (
    <select
      className="attendance-select"
      data-status={status}
      value={status}
      onChange={e => setStatus(e.target.value)}
    >
      {ATTEND_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function TherapistStats() {
  return (
    <div className="stats-bar">
      <div className="stat-tile">
        <div className="stat-label">Sessions Today</div>
        <div className="stat-number">3</div>
        <div className="stat-sub">1 in progress</div>
      </div>
      <div className="stat-tile">
        <div className="stat-label">This Week</div>
        <div className="stat-number">8</div>
        <div className="stat-sub">2 remaining</div>
      </div>
      <div className="stat-tile">
        <div className="stat-label">Pending Tasks</div>
        <div className="stat-number">3</div>
        <div className="stat-sub stat-sub--accent">2 due today</div>
      </div>
    </div>
  )
}

function AdminStats() {
  return (
    <div className="stats-bar">
      <div className="stat-tile">
        <div className="stat-label">Sessions Today</div>
        <div className="stat-number">11</div>
        <div className="stat-sub">across 4 therapists</div>
      </div>
      <div className="stat-tile">
        <div className="stat-label">Expected Revenue</div>
        <div className="stat-number stat-number--lg">₹16,500</div>
        <div className="stat-sub">from today's sessions</div>
      </div>
      <div className="stat-tile">
        <div className="stat-label">Today's Billing</div>
        <div className="stat-number stat-number--lg">₹9,000</div>
        <div className="stat-sub stat-sub--accent">₹7,500 pending</div>
      </div>
    </div>
  )
}

function StaffStats() {
  return (
    <div className="stats-bar">
      <div className="stat-tile">
        <div className="stat-label">Sessions Today</div>
        <div className="stat-number">5</div>
        <div className="stat-sub">assigned therapists</div>
      </div>
      <div className="stat-tile">
        <div className="stat-label">Expected Revenue</div>
        <div className="stat-number stat-number--lg">₹7,500</div>
        <div className="stat-sub">from today's sessions</div>
      </div>
      <div className="stat-tile">
        <div className="stat-label">Today's Billing</div>
        <div className="stat-number stat-number--lg">₹4,500</div>
        <div className="stat-sub stat-sub--accent">₹3,000 pending</div>
      </div>
    </div>
  )
}

// ── Session rows ───────────────────────────────────────────────────────────────
function SessionRow({ initials, avatarStyle, name, time, type, isPast, isNow, showStart, therapist, showAttendance }) {
  return (
    <div className={`session-row${isPast ? ' session-row--past' : ''}`}>
      <div className="avatar" style={avatarStyle}>{initials}</div>
      <div className="session-info">
        <span className="session-name">{name}</span>
        {therapist && <span className="session-therapist">{therapist}</span>}
        <div className="session-meta">
          <span className="session-time">{time}</span>
          <span className="session-type-pill">{type}</span>
          {isNow && <span className="badge-now">Now</span>}
        </div>
      </div>
      {showStart && <button className="btn-start">Start</button>}
      {showAttendance && <AttendanceSelect />}
    </div>
  )
}

// ── Therapist Coming Up ────────────────────────────────────────────────────────
function formatSessionTime(startH, startM, duration) {
  const endTotal = startH * 60 + startM + duration
  const endH = Math.floor(endTotal / 60)
  const endM = endTotal % 60
  const fmt = (h, m) => {
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const suffix = h < 12 ? 'AM' : 'PM'
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
  }
  return `${fmt(startH, startM)} – ${fmt(endH, endM)}`
}

function TherapistComingUp() {
  const { sessions, updateSession } = useSessions()
  const { getClient } = useClients()
  const navigate = useNavigate()
  const [consentSession, setConsentSession] = useState(null)

  const todayStr = new Date().toISOString().slice(0, 10)

  // Only show this therapist's sessions (dr-priya or sessions without a therapistId)
  const therapistSessions = sessions
    .filter(s => !s.therapistId || s.therapistId === 'dr-priya')
    .sort((a, b) => {
      const dc = a.date.localeCompare(b.date)
      return dc !== 0 ? dc : (a.startH * 60 + a.startM) - (b.startH * 60 + b.startM)
    })

  // Group by date string
  const grouped = {}
  therapistSessions.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = []
    grouped[s.date].push(s)
  })
  const dateGroups = Object.entries(grouped)

  const consentClient = consentSession ? getClient(consentSession.clientId) : null

  if (dateGroups.length === 0) {
    return (
      <>
        <div className="section-header">
          <span className="section-title">Coming up</span>
        </div>
        <div className="timeline-card">
          <div className="empty-state">
            <img src={upcomingEmptyImg} alt="" className="empty-img" />
            <p className="empty-text">No sessions scheduled yet. Book your first session to get started.</p>
          </div>
        </div>
      </>
    )
  }

  const upcomingCount = therapistSessions.filter(s => s.status === 'upcoming').length

  return (
    <>
      <div className="section-header">
        <span className="section-title">Coming up</span>
        <span className="section-meta">{upcomingCount} upcoming</span>
      </div>
      <div className="timeline-card">
        {dateGroups.map(([dateStr, dateSessions]) => {
          const d = new Date(dateStr)
          const day     = d.getDate()
          const month   = d.toLocaleDateString('en-GB', { month: 'short' })
          const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })

          const isPastDate  = dateStr < todayStr
          const isTodayDate = dateStr === todayStr
          const groupClass  = isPastDate
            ? 'date-group date-group--past'
            : isTodayDate
              ? 'date-group date-group--today'
              : 'date-group'

          const TYPE_LABEL = { online: 'Online', 'in-person': 'In-person', phone: 'Phone' }

          return (
            <div key={dateStr} className={groupClass}>
              <div className="date-stamp">
                <span className="date-day">{day}</span>
                <span className="date-meta">{month}<br />{dayName}</span>
              </div>
              <div className="session-list">
                {dateSessions.map(session => {
                  const client = getClient(session.clientId)
                  const isNow = isTodayDate && session.status === 'in-progress'
                  const showStart  = session.status === 'upcoming' && !isPastDate
                  const showResume = session.status === 'in-progress' || session.status === 'paused'

                  return (
                    <div
                      key={session.id}
                      className={`session-row${isPastDate ? ' session-row--past' : ''}`}
                    >
                      <div className="avatar" style={{ background: client?.colour }}>
                        {client?.initials}
                      </div>
                      <div className="session-info">
                        <span className="session-name">{client?.name}</span>
                        <div className="session-meta">
                          <span className="session-time">
                            {formatSessionTime(session.startH, session.startM, session.duration)}
                          </span>
                          <span className="session-type-pill">{TYPE_LABEL[session.type]}</span>
                          {isNow && <span className="badge-now">Now</span>}
                        </div>
                      </div>
                      {showStart && (
                        <button
                          className="btn-start"
                          onClick={() => setConsentSession(session)}
                        >
                          Start
                        </button>
                      )}
                      {showResume && (
                        <button
                          className="btn-start"
                          onClick={() => navigate(`/sessions/${session.id}/active`)}
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {consentSession && consentClient && (
        <ConsentModal
          session={consentSession}
          client={consentClient}
          onClose={() => setConsentSession(null)}
          onStart={consentGiven => {
            updateSession(consentSession.id, {
              status:          'in-progress',
              mode:            consentGiven ? 'ai-scribe' : 'handwritten',
              consentGiven,
              recordingActive: consentGiven,
            })
            const id = consentSession.id
            setConsentSession(null)
            navigate(`/sessions/${id}/active`)
          }}
        />
      )}
    </>
  )
}

// ── Admin Coming Up ────────────────────────────────────────────────────────────
function AdminComingUp() {
  return (
    <>
      <div className="section-header">
        <span className="section-title">Coming up</span>
        <span className="section-meta">11 sessions · today</span>
      </div>
      <div className="timeline-card">
        <div className="date-group date-group--past">
          <div className="date-stamp">
            <span className="date-day">30</span>
            <span className="date-meta">Apr<br />Thu</span>
          </div>
          <div className="session-list">
            <SessionRow initials="RS" avatarStyle={{ background: '#E8D5C4', color: '#7A5C3E' }} name="Rahul Sharma"   time="11:00 AM – 12:00 PM" type="Online"    therapist="with Dr. Priya S."  isPast showAttendance />
            <SessionRow initials="MK" avatarStyle={{ background: '#C4D5E8', color: '#3A5A78' }} name="Meera Krishnan" time="2:00 PM – 3:00 PM"   type="In-Person" therapist="with Dr. Arjun K."  isPast showAttendance />
            <SessionRow initials="AB" avatarStyle={{ background: '#D5C4E8', color: '#5A3A78' }} name="Ananya Bose"    time="4:00 PM – 5:00 PM"   type="Online"    therapist="with Dr. Priya S."  isPast showAttendance />
          </div>
        </div>
        <div className="date-group date-group--today">
          <div className="date-stamp">
            <span className="date-day">1</span>
            <span className="date-meta">May<br />Fri</span>
          </div>
          <div className="session-list">
            <SessionRow initials="SR" avatarStyle={{ background: '#C4E8D5', color: '#2B6B62' }} name="Sunita Rao"   time="10:00 AM – 11:00 AM" type="Phone"  therapist="with Dr. Priya S."  isPast showAttendance />
            <SessionRow initials="VM" avatarStyle={{ background: '#E8C4D4', color: '#783A5A' }} name="Vikram Mehta" time="3:00 PM – 4:00 PM"   type="Online" therapist="with Dr. Arjun K." isNow  showAttendance />
          </div>
        </div>
        <div className="date-group">
          <div className="date-stamp">
            <span className="date-day">2</span>
            <span className="date-meta">May<br />Sat</span>
          </div>
          <div className="session-list">
            <SessionRow initials="PN" avatarStyle={{ background: '#E8E4C4', color: '#6B6030' }} name="Preethi Nair" time="12:30 PM – 1:30 PM" type="In-Person" therapist="with Dr. Priya S." showAttendance />
            <SessionRow initials="RS" avatarStyle={{ background: '#E8D5C4', color: '#7A5C3E' }} name="Rahul Sharma" time="5:00 PM – 6:00 PM"  type="Online"    therapist="with Dr. Arjun K." showAttendance />
          </div>
        </div>
      </div>
    </>
  )
}

// ── Staff Coming Up ────────────────────────────────────────────────────────────
function StaffComingUp() {
  return (
    <>
      <div className="section-header">
        <span className="section-title">Coming up</span>
        <span className="section-meta">5 sessions · today</span>
      </div>
      <div className="timeline-card">
        <div className="date-group date-group--past">
          <div className="date-stamp">
            <span className="date-day">30</span>
            <span className="date-meta">Apr<br />Thu</span>
          </div>
          <div className="session-list">
            <SessionRow initials="RS" avatarStyle={{ background: '#E8D5C4', color: '#7A5C3E' }} name="Rahul Sharma" time="11:00 AM – 12:00 PM" type="Online" therapist="with Dr. Priya S." isPast showAttendance />
          </div>
        </div>
        <div className="date-group date-group--today">
          <div className="date-stamp">
            <span className="date-day">1</span>
            <span className="date-meta">May<br />Fri</span>
          </div>
          <div className="session-list">
            <SessionRow initials="SR" avatarStyle={{ background: '#C4E8D5', color: '#2B6B62' }} name="Sunita Rao"   time="10:00 AM – 11:00 AM" type="Phone"  therapist="with Dr. Priya S." isPast showAttendance />
            <SessionRow initials="VM" avatarStyle={{ background: '#E8C4D4', color: '#783A5A' }} name="Vikram Mehta" time="3:00 PM – 4:00 PM"   type="Online" therapist="with Dr. Priya S." isNow  showAttendance />
          </div>
        </div>
        <div className="date-group">
          <div className="date-stamp">
            <span className="date-day">2</span>
            <span className="date-meta">May<br />Sat</span>
          </div>
          <div className="session-list">
            <SessionRow initials="PN" avatarStyle={{ background: '#E8E4C4', color: '#6B6030' }} name="Preethi Nair" time="12:30 PM – 1:30 PM" type="In-Person" therapist="with Dr. Priya S." showAttendance />
          </div>
        </div>
      </div>
    </>
  )
}

// ── Task row ───────────────────────────────────────────────────────────────────
function TaskRow({ urgent, initials, avatarStyle, title, sub, due }) {
  return (
    <a className="task-row" href="#">
      <div className={`task-dot ${urgent ? 'task-dot--urgent' : 'task-dot--standard'}`} />
      <div className="task-avatar" style={avatarStyle}>{initials}</div>
      <div className="task-info">
        <div className="task-title">{title}</div>
        <div className="task-sub">{sub}</div>
      </div>
      <div className="task-due">{due}</div>
      <div className="task-chevron"><ChevronRight /></div>
    </a>
  )
}

// ── Tasks ──────────────────────────────────────────────────────────────────────
function TherapistTasks() {
  return (
    <>
      <div className="section-header">
        <span className="section-title">Things to do</span>
        <span className="section-meta">3 remaining</span>
      </div>
      <div className="task-card">
        <TaskRow urgent initials="SR" avatarStyle={{ background: '#C4E8D5', color: '#2B6B62' }} title="Complete intake assessment"   sub="Sunita Rao · New client: scheduled tomorrow"    due="Tomorrow" />
        <TaskRow        initials="RS" avatarStyle={{ background: '#E8D5C4', color: '#7A5C3E' }} title="Send session summary form"     sub="Rahul Sharma · Awaiting form completion"          due="Today" />
        <TaskRow        initials="AB" avatarStyle={{ background: '#D5C4E8', color: '#5A3A78' }} title="Collect payment"               sub="Ananya Bose · Session on Apr 30"                  due="Today" />
      </div>
    </>
  )
}

function AdminTasks() {
  return (
    <>
      <div className="section-header">
        <span className="section-title">Things to do</span>
        <span className="section-meta">4 remaining</span>
      </div>
      <div className="task-card">
        <TaskRow urgent initials="AB" avatarStyle={{ background: '#FEE8E8', color: '#B71C1C' }} title="Follow up on unpaid invoice"          sub="Ananya Bose · ₹1,500 overdue"                      due="3 days ago" />
        <TaskRow urgent initials="NK" avatarStyle={{ background: '#C4D5E8', color: '#3A5A78' }} title="New client registration to review"    sub="Neha Kulkarni · Submitted yesterday"               due="Today" />
        <TaskRow        initials="RS" avatarStyle={{ background: '#E8D5C4', color: '#7A5C3E' }} title="Billing gap — session not invoiced"   sub="Rahul Sharma · Dr. Priya S. · Apr 30"              due="Today" />
        <TaskRow        initials="AK" avatarStyle={{ background: '#D5E8D5', color: '#2B6B3E' }} title="Therapist schedule gap"               sub="Dr. Arjun K. · No sessions on May 5"               due="This week" />
      </div>
    </>
  )
}

function StaffTasks() {
  return (
    <>
      <div className="section-header">
        <span className="section-title">Things to do</span>
        <span className="section-meta">4 remaining</span>
      </div>
      <div className="task-card">
        <TaskRow urgent initials="SR" avatarStyle={{ background: '#C4E8D5', color: '#2B6B62' }} title="Send appointment confirmation"      sub="Sunita Rao · Today at 10:00 AM"                     due="Now" />
        <TaskRow urgent initials="PN" avatarStyle={{ background: '#E8E4C4', color: '#6B6030' }} title="Chase intake form"                  sub="Preethi Nair · Dr. Priya S. · Due today"            due="Today" />
        <TaskRow        initials="AB" avatarStyle={{ background: '#D5C4E8', color: '#5A3A78' }} title="Collect payment"                    sub="Ananya Bose · Session Apr 30 · ₹1,500"              due="Today" />
        <TaskRow        initials="VM" avatarStyle={{ background: '#E8C4D4', color: '#783A5A' }} title="Confirm session details with client" sub="Vikram Mehta · May 5 at 3:00 PM"                   due="Tomorrow" />
      </div>
    </>
  )
}

// ── Home ──────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth()
  const role = user?.role || 'Therapist'
  const roleContent = ROLE_CONTENT[role] || ROLE_CONTENT.Therapist

  const greeting = role === 'Admin' ? roleContent.greeting : getGreeting()

  // Derive first name from email for therapist/staff
  const firstName = user?.email?.split('@')[0]?.split('.')[0] || ''
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  return (
    <div className="home-page">
      {/* Greeting row */}
      <div className="greeting-row">
        <div>
          <h1 className="greeting">
            {greeting}
            {role !== 'Admin' && displayName && (
              <>, <span className="greeting-name">{displayName}</span></>
            )}
          </h1>
          <p className="greeting-sub">{roleContent.subtitle}</p>
        </div>
        <div className="date-pill">
          <Calendar size={14} />
          <span>{formatDate(new Date())}</span>
        </div>
      </div>

      {/* Stats */}
      {role === 'Admin'     && <AdminStats />}
      {role === 'Staff'     && <StaffStats />}
      {role === 'Therapist' && <TherapistStats />}

      {/* Coming up */}
      {role === 'Admin'     && <AdminComingUp />}
      {role === 'Staff'     && <StaffComingUp />}
      {role === 'Therapist' && <TherapistComingUp />}

      {/* Tasks */}
      {role === 'Admin'     && <AdminTasks />}
      {role === 'Staff'     && <StaffTasks />}
      {role === 'Therapist' && <TherapistTasks />}
    </div>
  )
}
