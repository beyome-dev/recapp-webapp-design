// src/pages/ClientProfile.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, AlertTriangle, Plus, ChevronDown,
  Upload, ArrowRightLeft, UserCog, Trash2,
  User, FileText, ClipboardList, CreditCard, Pencil,
  Mail, CheckCircle2, Send, Edit3, BookOpen,
} from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useBilling } from '../context/BillingContext'
import NewSessionModal from '../components/NewSessionModal'
import AddInvoiceModal from '../components/AddInvoiceModal'
import InvoiceDetailModal from '../components/InvoiceDetailModal'
import { InvoiceRow } from './Billing'
import './ClientProfile.css'

const TABS = [
  { id: 'client',     label: 'Client',     icon: User },
  { id: 'charts',     label: 'Charts',     icon: FileText },
  { id: 'assessment', label: 'Assessment', icon: ClipboardList },
  { id: 'billing',    label: 'Billing',    icon: CreditCard },
  { id: 'worksheets', label: 'Worksheets', icon: BookOpen },
]

const CONSENT_LABELS = {
  treatment: 'Therapy Consent',
  recording: 'AI Scribe Consent',
}

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ClientProfile() {
  const { id } = useParams()
  const { getClient, setAtRisk, deleteClient } = useClients()
  const navigate = useNavigate()
  const client = getClient(id)
  const [activeTab, setActiveTab] = useState('client')
  const [showNewSession, setShowNewSession] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const actionsRef = useRef(null)

  useEffect(() => {
    if (!actionsOpen) return
    function onClick(e) {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setActionsOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [actionsOpen])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (!client) {
    return (
      <div className="cprofile-page">
        <button className="cprofile-back" onClick={() => navigate('/clients')}>
          <ArrowLeft size={14} /> Back to Clients
        </button>
        <div className="cprofile-empty">Client not found.</div>
      </div>
    )
  }

  function handleDelete() {
    setActionsOpen(false)
    if (confirm(`Delete ${client.firstName} ${client.lastName}? This cannot be undone.`)) {
      deleteClient(client.id)
      navigate('/clients')
    }
  }

  function showToast(message) {
    setActionsOpen(false)
    setToast(message)
  }

  return (
    <div className="cprofile-page">
      <button className="cprofile-back" onClick={() => navigate('/clients')}>
        <ArrowLeft size={14} /> Back to Clients
      </button>

      <header className="cprofile-header">
        <div className="cprofile-identity">
          <div className="cprofile-avatar" style={{ background: client.colour }}>
            {client.initials}
          </div>
          <div>
            <h1 className="cprofile-name">{client.firstName} {client.lastName}</h1>
            <p className="cprofile-meta">
              {client.clientCode} · Joined {fmt(client.registrationDate)} · {client.totalSessions} sessions
            </p>
          </div>
        </div>

        <div className="cprofile-controls">
          <label className="atrisk-toggle">
            <input
              type="checkbox"
              checked={!!client.atRisk}
              onChange={e => setAtRisk(client.id, e.target.checked)}
            />
            <span className="atrisk-track"><span className="atrisk-thumb" /></span>
            <span className="atrisk-label">
              <AlertTriangle size={13} /> At Risk
            </span>
          </label>

          <div className="actions-wrap" ref={actionsRef}>
            <button
              className="btn-actions"
              onClick={() => setActionsOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
            >
              Actions <ChevronDown size={14} />
            </button>
            {actionsOpen && (
              <div className="actions-menu" role="menu">
                <button className="actions-item" onClick={() => showToast('Upload Document — coming next')}>
                  <Upload size={14} /> Upload Document
                </button>
                <button className="actions-item" onClick={() => showToast('Transfer Client — coming next')}>
                  <ArrowRightLeft size={14} /> Transfer Client
                </button>
                <button className="actions-item" onClick={() => showToast('Manage Therapist — coming next')}>
                  <UserCog size={14} /> Manage Therapist
                </button>
                <div className="actions-divider" />
                <button className="actions-item actions-danger" onClick={handleDelete}>
                  <Trash2 size={14} /> Delete Client
                </button>
              </div>
            )}
          </div>

          <button className="btn-new-session-on-profile" onClick={() => setShowNewSession(true)}>
            <Plus size={14} /> New Session
          </button>
        </div>
      </header>

      <nav className="cprofile-tabs" role="tablist">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            role="tab"
            aria-selected={activeTab === tabId}
            className={`cprofile-tab ${activeTab === tabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tabId)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>

      <div className="cprofile-tab-body">
        {activeTab === 'client'     && <ClientTab     client={client} />}
        {activeTab === 'charts'     && <ChartsTab     client={client} onStub={showToast} />}
        {activeTab === 'assessment' && <AssessmentTab client={client} onStub={showToast} />}
        {activeTab === 'billing'    && <BillingTab    client={client} onStub={showToast} />}
        {activeTab === 'worksheets' && <WorksheetsTab client={client} onStub={showToast} />}
      </div>

      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          preselectedClient={{
            id:       client.id,
            name:     `${client.firstName} ${client.lastName}`,
            initials: client.initials,
            colour:   client.colour,
          }}
        />
      )}

      {toast && <div className="cprofile-toast">{toast}</div>}
    </div>
  )
}

// ── Client tab (fully wired) ────────────────────────────────────────────────
function ClientTab({ client }) {
  const { updateClient, updateAddress, updateEmergencyContact, updateConsentStatus } = useClients()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    firstName:    client.firstName,
    lastName:     client.lastName,
    email:        client.email || '',
    phone:        client.phone || '',
    dateOfBirth:  client.dateOfBirth || '',
    gender:       client.gender || '',
  })

  useEffect(() => {
    setForm({
      firstName:    client.firstName,
      lastName:     client.lastName,
      email:        client.email || '',
      phone:        client.phone || '',
      dateOfBirth:  client.dateOfBirth || '',
      gender:       client.gender || '',
    })
  }, [client.id])

  function handleSave() {
    if (!form.firstName.trim()) { alert('First name is required.'); return }
    updateClient(client.id, {
      firstName:    form.firstName.trim(),
      lastName:     form.lastName.trim(),
      email:        form.email.trim(),
      phone:        form.phone.trim(),
      dateOfBirth:  form.dateOfBirth,
      gender:       form.gender,
    })
    setEditing(false)
  }

  return (
    <div className="ctab-grid">
      {/* Profile details */}
      <section className="ctab-card">
        <header className="ctab-card-head">
          <h2 className="ctab-card-title">Profile details</h2>
          {!editing
            ? <button className="ctab-edit" onClick={() => setEditing(true)}><Pencil size={12} /> Edit</button>
            : (
              <div className="ctab-edit-actions">
                <button className="ctab-cancel" onClick={() => setEditing(false)}>Cancel</button>
                <button className="ctab-save" onClick={handleSave}>Save</button>
              </div>
            )
          }
        </header>
        <div className="ctab-fields">
          <Field label="First name" required>
            {editing
              ? <input className="ctab-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              : <span>{client.firstName || '—'}</span>}
          </Field>
          <Field label="Last name">
            {editing
              ? <input className="ctab-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              : <span>{client.lastName || '—'}</span>}
          </Field>
          <Field label="Email">
            {editing
              ? <input className="ctab-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              : <span>{client.email || '—'}</span>}
          </Field>
          <Field label="Phone">
            {editing
              ? <input className="ctab-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              : <span>{client.phone || '—'}</span>}
          </Field>
          <Field label="Date of birth">
            {editing
              ? <input className="ctab-input" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
              : <span>{fmt(client.dateOfBirth)}</span>}
          </Field>
          <Field label="Pronouns / Gender">
            {editing
              ? <input className="ctab-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} placeholder="e.g. she/her or Female" />
              : <span>{client.gender || '—'}</span>}
          </Field>
        </div>
      </section>

      {/* Address */}
      <AddressSection client={client} updateAddress={updateAddress} />

      {/* Emergency Contact */}
      <EmergencyContactSection client={client} updateEmergencyContact={updateEmergencyContact} />

      {/* Consent & Compliance */}
      <ConsentSection client={client} updateConsentStatus={updateConsentStatus} />
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="ctab-field">
      <label className="ctab-label">
        {label}{required && <span className="ctab-required"> *</span>}
      </label>
      <div className="ctab-value">{children}</div>
    </div>
  )
}

function AddressSection({ client, updateAddress }) {
  const a = client.demographics?.address || {}
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    street:     a.street     || '',
    city:       a.city       || '',
    state:      a.state      || '',
    postalCode: a.postalCode || '',
  })

  useEffect(() => {
    setForm({
      street:     a.street     || '',
      city:       a.city       || '',
      state:      a.state      || '',
      postalCode: a.postalCode || '',
    })
  }, [client.id])

  function handleSave() {
    updateAddress(client.id, form)
    setEditing(false)
  }

  return (
    <section className="ctab-card">
      <header className="ctab-card-head">
        <h2 className="ctab-card-title">Home address</h2>
        {!editing
          ? <button className="ctab-edit" onClick={() => setEditing(true)}><Pencil size={12} /> Edit</button>
          : (
            <div className="ctab-edit-actions">
              <button className="ctab-cancel" onClick={() => setEditing(false)}>Cancel</button>
              <button className="ctab-save" onClick={handleSave}>Save</button>
            </div>
          )
        }
      </header>
      <div className="ctab-fields">
        <Field label="Street">
          {editing
            ? <input className="ctab-input" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} />
            : <span>{a.street || '—'}</span>}
        </Field>
        <Field label="City">
          {editing
            ? <input className="ctab-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            : <span>{a.city || '—'}</span>}
        </Field>
        <Field label="State">
          {editing
            ? <input className="ctab-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
            : <span>{a.state || '—'}</span>}
        </Field>
        <Field label="Pincode">
          {editing
            ? <input className="ctab-input" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} />
            : <span>{a.postalCode || '—'}</span>}
        </Field>
      </div>
    </section>
  )
}

function EmergencyContactSection({ client, updateEmergencyContact }) {
  const ec = client.demographics?.emergencyContact || { name: '', relationship: '', phone: '' }
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: ec.name || '', relationship: ec.relationship || '', phone: ec.phone || '' })

  useEffect(() => {
    setForm({ name: ec.name || '', relationship: ec.relationship || '', phone: ec.phone || '' })
  }, [client.id])

  function handleSave() {
    updateEmergencyContact(client.id, form)
    setEditing(false)
  }

  return (
    <section className="ctab-card">
      <header className="ctab-card-head">
        <h2 className="ctab-card-title">Emergency contact</h2>
        {!editing
          ? <button className="ctab-edit" onClick={() => setEditing(true)}><Pencil size={12} /> Edit</button>
          : (
            <div className="ctab-edit-actions">
              <button className="ctab-cancel" onClick={() => setEditing(false)}>Cancel</button>
              <button className="ctab-save" onClick={handleSave}>Save</button>
            </div>
          )
        }
      </header>
      <div className="ctab-fields">
        <Field label="Name">
          {editing
            ? <input className="ctab-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            : <span>{ec.name || '—'}</span>}
        </Field>
        <Field label="Relationship">
          {editing
            ? <input className="ctab-input" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} />
            : <span>{ec.relationship || '—'}</span>}
        </Field>
        <Field label="Phone">
          {editing
            ? <input className="ctab-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            : <span>{ec.phone || '—'}</span>}
        </Field>
      </div>
    </section>
  )
}

function ConsentSection({ client, updateConsentStatus }) {
  const consents = client.consents || []

  function sendForm(type) {
    const sentDate = new Date().toISOString().slice(0, 10)
    updateConsentStatus(client.id, type, { status: 'sent', sentDate })
  }

  function markCompleted(type) {
    updateConsentStatus(client.id, type, {
      status: 'completed',
      completedDate: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <section className="ctab-card ctab-card-wide">
      <header className="ctab-card-head">
        <h2 className="ctab-card-title">Consent &amp; compliance</h2>
        <span className="ctab-card-hint">Forms emailed to client; status updates here</span>
      </header>
      <div className="consent-rows">
        {consents.map(c => {
          const label = CONSENT_LABELS[c.type] || c.type
          const isSent = c.status === 'sent'
          const isCompleted = c.status === 'completed'
          return (
            <div className="consent-row" key={c.type}>
              <div className="consent-info">
                <div className="consent-icon" aria-hidden="true">
                  {isCompleted ? <CheckCircle2 size={16} /> : <Mail size={16} />}
                </div>
                <div>
                  <div className="consent-name">{label}</div>
                  <div className="consent-meta">
                    {isCompleted && `Completed ${fmt(c.completedDate)}`}
                    {isSent     && `Sent ${fmt(c.sentDate)} · awaiting client`}
                    {!isCompleted && !isSent && 'Not sent yet'}
                  </div>
                </div>
              </div>
              <div className="consent-actions">
                {!isSent && !isCompleted && (
                  <button className="ctab-btn-secondary" onClick={() => sendForm(c.type)}>
                    <Send size={12} /> Send
                  </button>
                )}
                {isSent && (
                  <>
                    <button className="ctab-btn-tertiary" onClick={() => sendForm(c.type)}>
                      Resend
                    </button>
                    <button className="ctab-btn-secondary" onClick={() => markCompleted(c.type)}>
                      <CheckCircle2 size={12} /> Mark received
                    </button>
                  </>
                )}
                {isCompleted && (
                  <span className="consent-pill"><CheckCircle2 size={12} /> Completed</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Intake Forms — frontend-only stub (see docs/contradictions.md) */}
        <div className="consent-row consent-row-stub">
          <div className="consent-info">
            <div className="consent-icon" aria-hidden="true"><Edit3 size={16} /></div>
            <div>
              <div className="consent-name">Intake Forms</div>
              <div className="consent-meta">Not in backend yet — stubbed for design preview</div>
            </div>
          </div>
          <div className="consent-actions">
            <button className="ctab-btn-tertiary" disabled>Coming next</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Stub tabs ───────────────────────────────────────────────────────────────
function StubTab({ title, blurb, onStub, ctaLabel }) {
  return (
    <section className="ctab-card ctab-card-wide ctab-stub">
      <header className="ctab-card-head">
        <h2 className="ctab-card-title">{title}</h2>
      </header>
      <p className="ctab-stub-blurb">{blurb}</p>
      <button className="ctab-btn-secondary" onClick={() => onStub(`${title} — coming next`)}>
        {ctaLabel}
      </button>
    </section>
  )
}

function ChartsTab({ client, onStub }) {
  return (
    <div className="ctab-grid">
      <StubTab
        title="Session notes"
        blurb={`Reuses the existing Sessions view — ${client.totalSessions} prior session${client.totalSessions === 1 ? '' : 's'} on record.`}
        onStub={onStub}
        ctaLabel="View in Sessions"
      />
      <StubTab
        title="Assessment reports"
        blurb="Completed assessments will appear here once the Assessment library is wired up."
        onStub={onStub}
        ctaLabel="Open assessments"
      />
      <StubTab
        title="Treatment plans"
        blurb="Active and historical treatment plans for this client."
        onStub={onStub}
        ctaLabel="Manage plans"
      />
      <StubTab
        title="Uploaded documents"
        blurb="Files uploaded via the Actions menu will land here."
        onStub={onStub}
        ctaLabel="Upload document"
      />
    </div>
  )
}

function AssessmentTab({ client, onStub }) {
  return (
    <div className="ctab-grid">
      <StubTab
        title="Progress chart"
        blurb="Score trend across assessments over time. Hover a point to see the score; filter by assessment."
        onStub={onStub}
        ctaLabel="View results"
      />
      <StubTab
        title="Assigned assessments"
        blurb="No assessments assigned yet. Assigning sends the questionnaire to the client by email."
        onStub={onStub}
        ctaLabel="View Library"
      />
    </div>
  )
}

function BillingTab({ client }) {
  const { invoicesByClient } = useBilling()
  const [showAdd, setShowAdd] = useState(false)
  const [openInvoiceId, setOpenInvoiceId] = useState(null)
  const list = invoicesByClient(client.id)
    .slice()
    .sort((a, b) => (b.issueDate > a.issueDate ? 1 : -1))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <section className="ctab-card ctab-card-wide">
      <header className="ctab-card-head">
        <h2 className="ctab-card-title">Invoices</h2>
        <button className="ctab-btn-secondary" onClick={() => setShowAdd(true)}>
          <Plus size={12} /> New invoice
        </button>
      </header>
      {list.length === 0 ? (
        <p className="ctab-stub-blurb">No invoices yet for this client.</p>
      ) : (
        <div className="invoice-list">
          {list.map(inv => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              client={client}
              today={today}
              dense
              onOpen={() => setOpenInvoiceId(inv.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddInvoiceModal onClose={() => setShowAdd(false)} preselectedClientId={client.id} />
      )}
      {openInvoiceId && (
        <InvoiceDetailModal invoiceId={openInvoiceId} onClose={() => setOpenInvoiceId(null)} />
      )}
    </section>
  )
}

function WorksheetsTab({ client, onStub }) {
  return (
    <div className="ctab-grid">
      <StubTab
        title="Assigned worksheets"
        blurb="Send therapeutic worksheets on a one-time or recurring schedule. Clients complete them via email."
        onStub={onStub}
        ctaLabel="Browse Library"
      />
      <StubTab
        title="Completed worksheets"
        blurb="Submitted responses appear here. Filter by date to track progress over time."
        onStub={onStub}
        ctaLabel="Open completed"
      />
    </div>
  )
}
