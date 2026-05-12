// src/pages/Settings.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  User, Bell, Award, CalendarDays, Link as LinkIcon,
  CreditCard as CreditIcon, Building2, Plus, Trash2,
  Camera, Check, X, Save,
} from 'lucide-react'
import {
  useSettings,
  LICENSE_TYPES,
  NOTIFICATION_EVENTS,
  DAYS_OF_WEEK,
} from '../context/SettingsContext'
import './Settings.css'

const SECTIONS = [
  {
    id: 'my-account', label: 'My Account', icon: User,
    subs: [
      { id: 'profile',     label: 'Profile',             icon: User },
      { id: 'notifications', label: 'Notifications',     icon: Bell },
      { id: 'credentials', label: 'Clinical Credentials', icon: Award },
    ],
  },
  {
    id: 'scheduling', label: 'Scheduling', icon: CalendarDays,
    subs: [
      { id: 'availability', label: 'Availability',   icon: CalendarDays },
      { id: 'calendar-sync', label: 'Calendar Sync', icon: LinkIcon },
    ],
  },
  { id: 'billing',       label: 'Billing',       icon: CreditIcon, subs: [] },
  { id: 'organisations', label: 'Organisations', icon: Building2,  subs: [] },
]

function findSection(id) {
  return SECTIONS.find(s => s.id === id) || SECTIONS[0]
}

export default function Settings() {
  const { section: routeSection, sub: routeSub } = useParams()
  const navigate = useNavigate()

  const sectionId = routeSection && SECTIONS.find(s => s.id === routeSection) ? routeSection : 'my-account'
  const section   = findSection(sectionId)
  const subId     = routeSub && section.subs.find(s => s.id === routeSub) ? routeSub : (section.subs[0]?.id || null)

  function setSection(id) {
    const s = findSection(id)
    const firstSub = s.subs[0]?.id
    navigate(firstSub ? `/settings/${id}/${firstSub}` : `/settings/${id}`)
  }

  function setSub(id) {
    navigate(`/settings/${sectionId}/${id}`)
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account, scheduling, and clinic configuration.</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-rail" aria-label="Settings sections">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                className={`rail-item ${sectionId === s.id ? 'active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                <Icon size={15} />
                <span>{s.label}</span>
              </button>
            )
          })}
        </nav>

        <main className="settings-main">
          {section.subs.length > 0 && (
            <nav className="settings-subtabs" role="tablist" aria-label={`${section.label} sections`}>
              {section.subs.map(sub => {
                const Icon = sub.icon
                return (
                  <button
                    key={sub.id}
                    role="tab"
                    aria-selected={subId === sub.id}
                    className={`subtab ${subId === sub.id ? 'active' : ''}`}
                    onClick={() => setSub(sub.id)}
                  >
                    <Icon size={13} /> {sub.label}
                  </button>
                )
              })}
            </nav>
          )}

          <div className="settings-content">
            {sectionId === 'my-account' && subId === 'profile'      && <ProfileSection />}
            {sectionId === 'my-account' && subId === 'notifications'&& <NotificationsSection />}
            {sectionId === 'my-account' && subId === 'credentials'  && <CredentialsSection />}
            {sectionId === 'scheduling' && subId === 'availability' && <AvailabilitySection />}
            {sectionId === 'scheduling' && subId === 'calendar-sync'&& <CalendarSyncSection />}
            {sectionId === 'billing'       && <BillingSettingsStub />}
            {sectionId === 'organisations' && <OrganisationsStub />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────
function ProfileSection() {
  const { settings, updateProfile } = useSettings()
  const p = settings.profile
  const [form, setForm] = useState(p)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm(p) }, [p.email]) // re-seed if user changes

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }
  function handleSave() {
    if (!form.firstName.trim()) { alert('First name is required.'); return }
    updateProfile({
      firstName: form.firstName.trim(),
      lastName:  form.lastName.trim(),
      email:     form.email.trim(),
      phone:     form.phone.trim(),
      licenseType: form.licenseType,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <section className="set-card">
      <header className="set-card-head">
        <div>
          <h2 className="set-card-title">Profile</h2>
          <p className="set-card-sub">Update your profile and personal details.</p>
        </div>
        {saved && <span className="set-saved-pill"><Check size={12} /> Saved</span>}
      </header>

      <div className="set-profile-image">
        <div className="set-avatar-lg">
          {p.firstName?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <button className="set-btn-tertiary" onClick={() => alert('Profile image upload — coming next')}>
            <Camera size={13} /> Change photo
          </button>
          <p className="set-tiny-hint">JPG or PNG · max 2 MB</p>
        </div>
      </div>

      <div className="set-grid">
        <Field label="First name" required>
          <input className="set-input" value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} />
        </Field>
        <Field label="Last name">
          <input className="set-input" value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} />
        </Field>
        <Field label="Email address">
          <input type="email" className="set-input" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Phone number">
          <input className="set-input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
        </Field>
        <Field label="License type" span={2}>
          <select className="set-input" value={form.licenseType || ''} onChange={e => set('licenseType', e.target.value)}>
            {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div className="set-actions">
        <button className="set-btn-primary" onClick={handleSave}>
          <Save size={14} /> Save changes
        </button>
      </div>
    </section>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────
function NotificationsSection() {
  const { settings, updateNotificationPref } = useSettings()
  return (
    <section className="set-card">
      <header className="set-card-head">
        <h2 className="set-card-title">Notifications</h2>
        <p className="set-card-sub">Choose which platform events trigger notifications.</p>
      </header>

      <div className="set-prefs">
        {NOTIFICATION_EVENTS.map(ev => {
          const enabled = !!settings.notificationPrefs[ev.id]
          return (
            <label key={ev.id} className="set-pref-row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => updateNotificationPref(ev.id, e.target.checked)}
              />
              <span className="set-pref-label">{ev.label}</span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

// ── Clinical Credentials ──────────────────────────────────────────────────
function CredentialsSection() {
  const { settings, addCredential, updateCredential, removeCredential } = useSettings()
  const [draft, setDraft] = useState({ credentials: '', licenseNumber: '', state: '', expirationDate: '' })

  function handleAdd() {
    if (!draft.credentials.trim()) { alert('Credentials (e.g. RCI Psychologist) is required.'); return }
    addCredential(draft)
    setDraft({ credentials: '', licenseNumber: '', state: '', expirationDate: '' })
  }

  return (
    <section className="set-card">
      <header className="set-card-head">
        <div>
          <h2 className="set-card-title">Clinical Credentials</h2>
          <p className="set-card-sub">Add and manage your professional licensing for compliance.</p>
        </div>
      </header>

      <div className="set-cred-list">
        {settings.credentials.length === 0 && (
          <div className="set-empty">No credentials added yet.</div>
        )}
        {settings.credentials.map(c => (
          <CredentialRow key={c.id} cred={c} onUpdate={updateCredential} onRemove={removeCredential} />
        ))}
      </div>

      <div className="set-add-cred">
        <h3 className="set-mini-title">Add credential</h3>
        <div className="set-grid">
          <Field label="Credentials">
            <input
              className="set-input"
              placeholder="e.g. RCI Psychologist"
              value={draft.credentials}
              onChange={e => setDraft({ ...draft, credentials: e.target.value })}
            />
          </Field>
          <Field label="License number">
            <input
              className="set-input"
              value={draft.licenseNumber}
              onChange={e => setDraft({ ...draft, licenseNumber: e.target.value })}
            />
          </Field>
          <Field label="State">
            <input
              className="set-input"
              value={draft.state}
              onChange={e => setDraft({ ...draft, state: e.target.value })}
            />
          </Field>
          <Field label="Expiration date">
            <input
              type="date"
              className="set-input"
              value={draft.expirationDate}
              onChange={e => setDraft({ ...draft, expirationDate: e.target.value })}
            />
          </Field>
        </div>
        <div className="set-actions">
          <button className="set-btn-primary" onClick={handleAdd}>
            <Plus size={14} /> Add credential
          </button>
        </div>
      </div>
    </section>
  )
}

function CredentialRow({ cred, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(cred)

  useEffect(() => { setForm(cred) }, [cred.id])

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }
  function handleSave() {
    if (!form.credentials.trim()) { alert('Credentials is required.'); return }
    onUpdate(cred.id, form)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="set-cred-row">
        <div className="set-cred-info">
          <div className="set-cred-name">{cred.credentials || '—'}</div>
          <div className="set-cred-meta">
            {cred.licenseNumber && <span>#{cred.licenseNumber}</span>}
            {cred.state && <span>· {cred.state}</span>}
            {cred.expirationDate && <span>· expires {cred.expirationDate}</span>}
          </div>
        </div>
        <div className="set-cred-actions">
          <button className="set-btn-tertiary" onClick={() => setEditing(true)}>Edit</button>
          <button className="set-btn-icon-danger" onClick={() => onRemove(cred.id)} aria-label="Remove credential">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="set-cred-row set-cred-row-editing">
      <div className="set-grid">
        <Field label="Credentials">
          <input className="set-input" value={form.credentials} onChange={e => set('credentials', e.target.value)} />
        </Field>
        <Field label="License number">
          <input className="set-input" value={form.licenseNumber || ''} onChange={e => set('licenseNumber', e.target.value)} />
        </Field>
        <Field label="State">
          <input className="set-input" value={form.state || ''} onChange={e => set('state', e.target.value)} />
        </Field>
        <Field label="Expiration date">
          <input type="date" className="set-input" value={form.expirationDate || ''} onChange={e => set('expirationDate', e.target.value)} />
        </Field>
      </div>
      <div className="set-actions">
        <button className="set-btn-tertiary" onClick={() => setEditing(false)}>Cancel</button>
        <button className="set-btn-primary" onClick={handleSave}><Save size={14} /> Save</button>
      </div>
    </div>
  )
}

// ── Availability ──────────────────────────────────────────────────────────
function AvailabilitySection() {
  const { settings, updateWorkingHours } = useSettings()
  return (
    <section className="set-card">
      <header className="set-card-head">
        <div>
          <h2 className="set-card-title">Availability</h2>
          <p className="set-card-sub">Configure the days and times you are available for sessions.</p>
        </div>
      </header>

      <div className="set-avail-list">
        {settings.workingHours.map(d => {
          const label = DAYS_OF_WEEK.find(x => x.id === d.dayOfWeek)?.label
          return (
            <div className={`set-avail-row ${d.available ? '' : 'set-avail-off'}`} key={d.dayOfWeek}>
              <label className="set-avail-day">
                <input
                  type="checkbox"
                  checked={d.available}
                  onChange={e => updateWorkingHours(d.dayOfWeek, { available: e.target.checked })}
                  aria-label={`${label} available`}
                />
                <span>{label}</span>
              </label>
              <div className="set-avail-times">
                <input
                  type="time"
                  className="set-input set-input-time"
                  value={d.startTime}
                  onChange={e => updateWorkingHours(d.dayOfWeek, { startTime: e.target.value })}
                  disabled={!d.available}
                  aria-label={`${label} start time`}
                />
                <span className="set-avail-sep">to</span>
                <input
                  type="time"
                  className="set-input set-input-time"
                  value={d.endTime}
                  onChange={e => updateWorkingHours(d.dayOfWeek, { endTime: e.target.value })}
                  disabled={!d.available}
                  aria-label={`${label} end time`}
                />
                {!d.available && <span className="set-avail-status">Unavailable</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Calendar Sync ─────────────────────────────────────────────────────────
function CalendarSyncSection() {
  const { settings, connectGoogleCalendar, disconnectGoogleCalendar } = useSettings()
  const g = settings.calendarSync.google
  return (
    <section className="set-card">
      <header className="set-card-head">
        <div>
          <h2 className="set-card-title">Calendar Sync</h2>
          <p className="set-card-sub">Keep Recapp sessions in sync with your external calendar.</p>
        </div>
      </header>

      <div className="set-sync-row">
        <div className="set-sync-info">
          <div className="set-sync-name">Google Calendar</div>
          <div className="set-sync-meta">
            {g.connected
              ? `Connected as ${g.email} on ${g.connectedAt}`
              : 'Not connected — Recapp won’t push or pull events.'}
          </div>
        </div>
        <div>
          {g.connected
            ? <button className="set-btn-tertiary" onClick={disconnectGoogleCalendar}>Disconnect</button>
            : <button className="set-btn-primary" onClick={connectGoogleCalendar}>Connect Google Calendar</button>}
        </div>
      </div>

      <p className="set-tiny-hint">Mock integration — real OAuth is out of scope for this prototype.</p>
    </section>
  )
}

// ── Stubs ─────────────────────────────────────────────────────────────────
function BillingSettingsStub() {
  return (
    <section className="set-card set-stub">
      <header className="set-card-head">
        <h2 className="set-card-title">Billing</h2>
        <p className="set-card-sub">Manage your clinic’s services, pricing, and payment settings.</p>
      </header>
      <div className="set-empty">Coming next.</div>
    </section>
  )
}

function OrganisationsStub() {
  return (
    <section className="set-card set-stub">
      <header className="set-card-head">
        <h2 className="set-card-title">Organisations</h2>
        <p className="set-card-sub">Manage clinics, branches, and clinic-level configuration.</p>
      </header>
      <div className="set-empty">Coming next.</div>
    </section>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────
function Field({ label, required, span = 1, children }) {
  return (
    <label className={`set-field ${span === 2 ? 'set-field-span2' : ''}`}>
      <span className="set-label">
        {label}{required && <span className="set-required"> *</span>}
      </span>
      {children}
    </label>
  )
}
