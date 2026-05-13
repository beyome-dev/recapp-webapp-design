// src/pages/Clients.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle, X, ChevronRight } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import ClientSearchOrAdd from '../components/ClientSearchOrAdd'
import clientEmptyImg from '../assets/client_empty.png'
import './Clients.css'

const STATUS_FILTERS = ['All', 'Active', 'Inactive', 'Discharged']
const FILTER_TO_STATUS = { 'All': null, 'Active': 'active', 'Inactive': 'inactive', 'Discharged': 'discharged' }

const STATUS_BADGE = {
  active:     { label: 'Active',     cls: 'badge-green'   },
  inactive:   { label: 'Inactive',   cls: 'badge-neutral' },
  discharged: { label: 'Discharged', cls: 'badge-slate'   },
}

function fmtLastSession(d) {
  if (!d) return <span className="cell-muted">—</span>
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Clients() {
  const { clients, addClient } = useClients()
  const navigate = useNavigate()
  const [filter, setFilter]   = useState('All')
  const [query, setQuery]     = useState('')
  const [showModal, setShowModal] = useState(false)

  const status = FILTER_TO_STATUS[filter]
  const q = query.trim().toLowerCase()
  const visible = clients
    .filter(c => (status ? c.accountStatus === status : true))
    .filter(c => !q
      ? true
      : c.name.toLowerCase().includes(q) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q))
    .sort((a, b) => {
      const ad = a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0
      const bd = b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0
      return bd - ad
    })

  function handleRowClick(client) {
    navigate(`/clients/${client.id}`)
  }

  function handleSelectExisting(c) {
    setShowModal(false)
    navigate(`/clients/${c.id}`)
  }

  function handleCreate({ firstName, lastName }) {
    const created = addClient({ firstName, lastName })
    setShowModal(false)
    navigate(`/clients/${created.id}`)
  }

  const counts = {
    total:      clients.length,
    active:     clients.filter(c => c.accountStatus === 'active').length,
    atRisk:     clients.filter(c => c.atRisk).length,
  }

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div>
          <h1 className="clients-title">Clients</h1>
          <p className="clients-subtitle">
            {counts.total} clients · {counts.active} active{counts.atRisk ? ` · ${counts.atRisk} at risk` : ''}
          </p>
        </div>
        <button className="btn-new-client" onClick={() => setShowModal(true)}>
          <Plus size={14} />
          New Client
        </button>
      </div>

      <div className="clients-toolbar">
        <div className="clients-search-wrap">
          <Search size={14} />
          <input
            className="clients-search"
            placeholder="Search by name or email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="clients-filters">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="clients-table-wrap">
        <div className="clients-thead">
          <div className="clients-col-grid">
            <div className="clients-th">Client</div>
            <div className="clients-th">Status</div>
            <div className="clients-th">Email</div>
            <div className="clients-th">Phone</div>
            <div className="clients-th">Last session</div>
            <div className="clients-th clients-th-right" aria-hidden="true"></div>
          </div>
        </div>

        {visible.length === 0 && (
          <div className="clients-empty">
            <img src={clientEmptyImg} alt="" className="empty-img" />
            <p className="empty-text">
              {clients.length === 0
                ? 'No clients yet. Add your first client to get started.'
                : 'No clients match your search or filter.'}
            </p>
          </div>
        )}

        {visible.map(client => {
          const cfg = STATUS_BADGE[client.accountStatus] ?? STATUS_BADGE.active
          return (
            <div
              key={client.id}
              className="clients-row"
              onClick={() => handleRowClick(client)}
              role="button"
              tabIndex={0}
            >
              <div className="clients-col-grid">
                <div className="client-cell">
                  <div className="client-avatar" style={{ background: client.colour }}>
                    {client.initials}
                  </div>
                  <div className="client-name-wrap">
                    <span className="client-name">{client.firstName} {client.lastName}</span>
                    {client.atRisk && (
                      <span className="at-risk-pill" title="At Risk">
                        <AlertTriangle size={11} /> At risk
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <div className="cell-email">{client.email || <span className="cell-muted">—</span>}</div>
                <div className="cell-phone">{client.phone || <span className="cell-muted">—</span>}</div>
                <div className="cell-last">{fmtLastSession(client.lastSessionDate)}</div>
                <div className="cell-arrow"><ChevronRight size={16} /></div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="ncl-backdrop" onClick={() => setShowModal(false)}>
          <div className="ncl-panel" onClick={e => e.stopPropagation()}>
            <div className="ncl-header">
              <span className="ncl-title">New Client</span>
              <button className="ncl-close" onClick={() => setShowModal(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="ncl-body">
              <p className="ncl-sub">Search for an existing client or add a new one.</p>
              <ClientSearchOrAdd
                onSelect={handleSelectExisting}
                onCreate={handleCreate}
                placeholder="Type to search or add…"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
