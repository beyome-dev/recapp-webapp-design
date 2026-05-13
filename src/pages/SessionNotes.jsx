// src/pages/SessionNotes.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Video, MapPin, Phone, CheckCircle2, AlertTriangle, Circle, Clock, CalendarDays, Mic, PenLine, Plus } from 'lucide-react'
import { useSessions } from '../context/SessionsContext'
import { useClients } from '../context/ClientsContext'
import TemplatePicker from '../components/TemplatePicker'
import PSEOverlay from '../components/PSEOverlay'
import InvoiceDetailModal from '../components/InvoiceDetailModal'
import AddInvoiceModal from '../components/AddInvoiceModal'
import './SessionNotes.css'

const TYPE_ICON  = { online: Video, 'in-person': MapPin, phone: Phone }
const TYPE_LABEL = { online: 'Online', 'in-person': 'In-person', phone: 'Phone' }

function fmtTime(h, m) {
  const hh = h % 12 || 12
  const mm = String(m).padStart(2, '0')
  return `${hh}:${mm} ${h < 12 ? 'am' : 'pm'}`
}

function formatDateRange(date, startH, startM, durationMin) {
  const d   = new Date(date)
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const totalEndMin = startH * 60 + startM + durationMin
  const endH = Math.floor(totalEndMin / 60)
  const endM = totalEndMin % 60
  return `${day} · ${fmtTime(startH, startM)} – ${fmtTime(endH, endM)} · ${durationMin} min`
}

function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SessionNotes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sessions, getSessionNumber, updateSession } = useSessions()
  const { getClient } = useClients()

  const session = sessions.find(s => s.id === id)
  const client  = session ? getClient(session.clientId) : null
  const sessNum = session ? getSessionNumber(session.clientId, id) : 0

  const hasTranscript = session?.mode === 'ai-scribe'
  const tabs = hasTranscript
    ? ['Progress Note', 'Transcript', 'Billing']
    : ['Progress Note', 'Billing']

  const [activeTab, setActiveTab]             = useState('Progress Note')
  const [showTemplate, setShowTemplate]       = useState(false)
  const [showPSE, setShowPSE]                 = useState(false)
  const [showMyNotes, setShowMyNotes]         = useState(false)
  const [showFinalizeWarning, setShowFinalizeWarning] = useState(false)

  if (!session) return <div className="sn-not-found">Session not found.</div>

  const TypeIcon = TYPE_ICON[session.type] ?? Video

  function handleFinalize() {
    if (showFinalizeWarning) {
      setShowFinalizeWarning(false)
      return
    }
    const incomplete = []
    if (!session.pse.completed && !session.pse.skipped) incomplete.push('PSE not completed')
    if (!session.noteLocked) incomplete.push('Note not locked')
    if (session.billing.outstanding > 0) incomplete.push('Billing pending')
    if (incomplete.length > 0) setShowFinalizeWarning(incomplete)
  }

  function handleInvoicePaid(invoiceId, amount) {
    const now = new Date()
    const day = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const timestamp = `${day}, ${fmtTime(now.getHours(), now.getMinutes())}`
    updateSession(id, {
      billing: {
        ...session.billing,
        outstanding: session.billing.outstanding - amount,
        invoices: session.billing.invoices.map(inv =>
          inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
        ),
        activity: [
          ...session.billing.activity,
          {
            id: `act-${Date.now()}`,
            timestamp,
            event: `Payment ₹${amount.toLocaleString('en-IN')} received for ${invoiceId}`,
          },
        ],
      },
    })
  }

  const pseDone    = session.pse.completed
  const pseSkipped = !session.pse.completed && session.pse.skipped
  const noteLocked = session.noteLocked
  const billingOk  = session.billing.outstanding === 0

  const allDone = (session.pse.completed || session.pse.skipped)
               && session.noteLocked
               && session.billing.outstanding === 0

  useEffect(() => {
    if (allDone && session.status !== 'finalized') {
      updateSession(id, { status: 'finalized' })
    } else if (!allDone && session.status === 'finalized') {
      updateSession(id, { status: 'completed' })
    }
  }, [allDone, id, session.status]) // updateSession depends only on setSessions (stable)

  return (
    <div className="sn-page">
      <div className="sn-breadcrumb">
        <button className="sn-bc-link" onClick={() => navigate('/sessions')}>Sessions</button>
        <span className="sn-bc-sep">›</span>
        <span className="sn-bc-current">{client?.name} — Session {sessNum}</span>
      </div>

      {/* Session header */}
      <div className="sn-session-header">
        <div className="sn-session-header-client">
          <div className="sn-session-avatar" style={{ background: client?.colour }}>
            {client?.initials}
          </div>
          <h1 className="sn-session-name">{client?.name}</h1>
        </div>
        <div className="sn-session-chips">
          <span className="sn-chip sn-chip-green">Session #{sessNum}</span>
          <span className="sn-chip sn-chip-blue">{session.service}</span>
          <span className="sn-chip sn-chip-neutral">
            <TypeIcon size={11} />
            {TYPE_LABEL[session.type]}
          </span>
          <span className="sn-chip sn-chip-amber">
            {formatShortDate(session.date)} · {fmtTime(session.startH, session.startM)}
          </span>
          <span className="sn-chip sn-chip-neutral">
            {session.duration} min
          </span>
          <span className={`sn-chip ${session.mode === 'ai-scribe' ? 'sn-chip-blue' : 'sn-chip-neutral'}`}>
            {session.mode === 'ai-scribe' ? <Mic size={11} /> : <PenLine size={11} />}
            {session.mode === 'ai-scribe' ? 'AI Scribe' : 'Handwritten'}
          </span>
        </div>
      </div>

      <div className="sn-layout">
        <div className="sn-main">
          <div className="sn-tabs">
            {tabs.map(t => (
              <button
                key={t}
                className={`sn-tab ${activeTab === t ? 'active' : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="sn-tab-content">
            {activeTab === 'Progress Note' && (
              <ProgressNoteTab
                session={session}
                showMyNotes={showMyNotes}
                setShowMyNotes={setShowMyNotes}
                onTemplateOpen={() => setShowTemplate(true)}
                onLock={() => updateSession(id, { noteLocked: true })}
              />
            )}
            {activeTab === 'Transcript' && (
              <TranscriptTab session={session} client={client} />
            )}
            {activeTab === 'Billing' && (
              <BillingTab session={session} onInvoicePaid={handleInvoicePaid} />
            )}
          </div>
        </div>

        <div className="sn-right">
          <div className="sn-wrap-section">
            <div className="sn-wrap-title">Session Wrap-Up</div>

            <button
              className={`sn-finalize-btn${allDone ? ' sn-finalize-btn--done' : ''}`}
              onClick={!allDone ? handleFinalize : undefined}
              disabled={allDone}
            >
              {allDone ? 'Session Finalized' : 'Finalize Session'}
            </button>

            {showFinalizeWarning && Array.isArray(showFinalizeWarning) && (
              <div className="sn-finalize-warning">
                <AlertTriangle size={13} />
                <div>
                  {showFinalizeWarning.map(w => <div key={w}>{w}</div>)}
                </div>
              </div>
            )}

            <div className="sn-checklist">
              <ChecklistItem
                done={pseDone}
                warn={pseSkipped}
                label={pseDone ? 'PSE completed' : 'PSE skipped'}
                action={!pseDone ? 'Complete' : null}
                onAction={() => setShowPSE(true)}
              />
              <ChecklistItem
                done={noteLocked}
                warn={!noteLocked}
                label={noteLocked ? 'Note locked' : 'Note not locked'}
                action={!noteLocked ? 'Lock' : null}
                onAction={() => updateSession(id, { noteLocked: true })}
              />
              <ChecklistItem
                done={billingOk}
                warn={!billingOk}
                label={billingOk ? 'Invoice added' : 'Billing pending'}
                action={!billingOk ? 'Update' : null}
                onAction={() => setActiveTab('Billing')}
              />
            </div>
          </div>

          <div className="sn-info-section">
            <div className="sn-info-title">Session Info</div>
            <div className="sn-client-block">
              <div className="sn-client-avatar" style={{ background: client?.colour }}>
                {client?.initials}
              </div>
              <div>
                <div className="sn-client-name">{client?.name}</div>
                <span className="sn-session-badge">Session #{sessNum}</span>
              </div>
            </div>
            <div className="sn-meta-grid">
              <MetaRow icon={<CalendarDays size={13} />} label={formatShortDate(session.date)} />
              <MetaRow icon={<Clock size={13} />} label={`${fmtTime(session.startH, session.startM)} · ${session.duration} min`} />
              <MetaRow icon={<TypeIcon size={13} />} label={TYPE_LABEL[session.type]} />
              <MetaRow label={session.service} />
              <MetaRow
                label={
                  <span className={`sn-mode-badge ${session.mode === 'ai-scribe' ? 'blue' : 'grey'}`}>
                    {session.mode === 'ai-scribe' ? '✦ AI Scribe' : 'Handwritten'}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {showTemplate && (
        <TemplatePicker
          session={session}
          onClose={() => setShowTemplate(false)}
          onApply={() => setShowTemplate(false)}
        />
      )}

      {showPSE && (
        <PSEOverlay
          session={session}
          client={client}
          onDone={() => setShowPSE(false)}
          onSkip={() => setShowPSE(false)}
        />
      )}
    </div>
  )
}

function ChecklistItem({ done, warn, label, action, onAction }) {
  return (
    <div className="sn-checklist-item">
      {done
        ? <CheckCircle2 size={14} className="ci-green" />
        : warn
          ? <AlertTriangle size={14} className="ci-amber" />
          : <Circle size={14} className="ci-neutral" />}
      <span className={done ? 'ci-label-done' : 'ci-label-warn'}>{label}</span>
      {action && (
        <button className="ci-action" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

function MetaRow({ icon, label }) {
  return (
    <div className="sn-meta-row">
      {icon && <span className="sn-meta-icon">{icon}</span>}
      <span className="sn-meta-val">{label}</span>
    </div>
  )
}

function ProgressNoteTab({ session, showMyNotes, setShowMyNotes, onTemplateOpen, onLock }) {
  const { updateSession } = useSessions()
  const [enhancing, setEnhancing] = useState(false)

  const isAIScribe   = session.mode === 'ai-scribe'
  const isEnhanced   = session.noteEnhanced
  const myNotesAvail = isAIScribe || isEnhanced
  const canLock      = isAIScribe || isEnhanced

  function handleEnhance() {
    setEnhancing(true)
    setTimeout(() => {
      updateSession(session.id, { noteEnhanced: true })
      setEnhancing(false)
    }, 1200)
  }

  return (
    <div className="pn-tab">
      <div className="pn-header">
        <div className="pn-note-title">{session.noteTitle}</div>
        <div className="pn-note-meta">
          {formatDateRange(session.date, session.startH, session.startM, session.duration)}
        </div>
      </div>

      <div className="pn-controls">
        <button className="pn-template-btn" onClick={onTemplateOpen}>
          Format: Enhanced Note ▾
        </button>
        {myNotesAvail && (
          <button
            className={`pn-mynotes-btn ${showMyNotes ? 'open' : ''}`}
            onClick={() => setShowMyNotes(v => !v)}
          >
            My Notes
            {showMyNotes && <span className="pn-mn-x">×</span>}
          </button>
        )}
      </div>

      <div className="pn-body">
        {showMyNotes
          ? <p className="pn-raw-text">{session.rawNoteContent}</p>
          : <p className="pn-note-text">{session.noteContent}</p>
        }
      </div>

      {!isAIScribe && !isEnhanced && (
        <div className="pn-enhance-wrap">
          <button className="pn-enhance-fab" onClick={handleEnhance} disabled={enhancing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            {enhancing ? 'Enhancing…' : 'Enhance Note'}
          </button>
        </div>
      )}

      <div className="pn-action-bar">
        <span className="pn-version">{session.noteLocked ? 'v1' : 'Draft'}</span>
        <button className="pn-copy-btn">Copy Note</button>
        <button className="pn-edit-btn">Edit</button>
        <button
          className={`pn-lock-btn ${canLock ? '' : 'dimmed'}`}
          onClick={canLock ? onLock : undefined}
          disabled={!canLock}
        >
          {session.noteLocked ? 'Locked' : 'Sign & Lock'}
        </button>
      </div>
    </div>
  )
}

function TranscriptTab({ session, client }) {
  const lines = [
    { time: '00:02', speaker: 'Therapist', text: 'How have you been feeling since we last spoke?' },
    { time: '00:18', speaker: client?.name ?? 'Client', text: 'Honestly a bit overwhelmed. The situation at work got worse.' },
    { time: '00:45', speaker: 'Therapist', text: 'Can you tell me more about what happened?' },
    { time: '01:03', speaker: client?.name ?? 'Client', text: 'My manager sent feedback that I felt was unfair. I just shut down.' },
  ]
  return (
    <div className="tr-tab">
      <div className="tr-header">
        <div className="tr-meta">
          {session.duration} min · AI Scribe · {new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <button className="tr-copy">Copy transcript</button>
      </div>
      <div className="tr-lines">
        {lines.map((l, i) => (
          <div key={i} className="tr-line">
            <span className="tr-time">{l.time}</span>
            <span className={`tr-speaker ${l.speaker === 'Therapist' ? 'therapist' : 'client'}`}>{l.speaker}</span>
            <span className="tr-text">{l.text}</span>
          </div>
        ))}
      </div>
      <div className="tr-footer">{session.duration} min · ~320 words</div>
    </div>
  )
}

function BillingTab({ session, onInvoicePaid }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [showAddInvoice, setShowAddInvoice]       = useState(false)

  return (
    <div className="bl-tab">
      <div className="bl-summary-row">
        <div className="bl-summary">
          <div className="bl-total">₹{session.billing.total.toLocaleString('en-IN')}</div>
          {session.billing.outstanding > 0 && (
            <div className="bl-outstanding">₹{session.billing.outstanding.toLocaleString('en-IN')} outstanding</div>
          )}
        </div>
        <button className="bl-btn-add" onClick={() => setShowAddInvoice(true)}>
          <Plus size={12} /> Add Invoice
        </button>
      </div>

      <div className="bl-invoices">
        {session.billing.invoices.map(inv => (
          <div
            key={inv.id}
            className="bl-invoice-card bl-clickable"
            onClick={() => setSelectedInvoiceId(inv.id)}
          >
            <div className="bl-inv-left">
              <div className="bl-inv-id">{inv.id}</div>
              <div className="bl-inv-service">{inv.service}</div>
              <div className="bl-inv-date">{inv.date}</div>
            </div>
            <div className="bl-inv-right">
              <span className={`bl-inv-badge ${inv.status}`}>{inv.status}</span>
              <div className={`bl-inv-amount ${inv.status === 'draft' ? 'outstanding' : ''}`}>
                ₹{inv.amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {session.billing.activity.length > 0 && (
        <div className="bl-activity">
          <div className="bl-act-title">Activity</div>
          {session.billing.activity.map(a => (
            <div key={a.id} className="bl-act-row">
              <span className="bl-act-time">{a.timestamp}</span>
              <span className="bl-act-event">{a.event}</span>
            </div>
          ))}
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onInvoicePaid={onInvoicePaid}
        />
      )}

      {showAddInvoice && (
        <AddInvoiceModal
          preselectedClientId={session.clientId}
          onClose={() => setShowAddInvoice(false)}
        />
      )}
    </div>
  )
}
