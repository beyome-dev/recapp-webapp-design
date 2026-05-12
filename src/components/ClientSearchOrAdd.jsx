// src/components/ClientSearchOrAdd.jsx
import { useEffect, useRef, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import './ClientSearchOrAdd.css'

export default function ClientSearchOrAdd({
  onSelect,
  onCreate,
  placeholder = 'Search client by name…',
  autoFocus = true,
  excludeIds,
  extraOption,
}) {
  const { clients, addClient } = useClients()
  const [searchText, setSearchText] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 30)
  }, [autoFocus])

  const q = searchText.trim().toLowerCase()
  const pool = excludeIds?.length ? clients.filter(c => !excludeIds.includes(c.id)) : clients
  const filtered = q ? pool.filter(c => c.name.toLowerCase().includes(q) || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)) : pool
  const noResults = q.length > 0 && filtered.length === 0

  function handleCreate() {
    const parts = searchText.trim().split(/\s+/)
    const firstName = parts[0] || ''
    const lastName  = parts.slice(1).join(' ') || ''
    if (!firstName) return
    if (onCreate) {
      onCreate({ firstName, lastName }, searchText.trim())
      return
    }
    const created = addClient({ firstName, lastName })
    onSelect?.(created)
  }

  function fmtLastSession(d) {
    if (!d) return 'No sessions yet'
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="csa-root">
      <div className="csa-search-wrap">
        <Search size={16} />
        <input
          ref={inputRef}
          className="csa-search-input"
          type="text"
          placeholder={placeholder}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      {noResults ? (
        <>
          <p className="csa-no-client-msg">No client found</p>
          <div className="csa-add-option" onClick={handleCreate} role="button" tabIndex={0}>
            <div className="csa-add-icon"><Plus size={14} /></div>
            <span className="csa-add-label">Add new client, {searchText.trim()}</span>
          </div>
          {extraOption}
        </>
      ) : (
        <div className="csa-client-results">
          {filtered.map(c => (
            <div className="csa-client-row" key={c.id} onClick={() => onSelect?.(c)} role="button" tabIndex={0}>
              <div className="csa-client-avatar" style={{ background: c.colour || '#475569' }}>{c.initials}</div>
              <div className="csa-client-info">
                <div className="csa-client-name">{c.name}</div>
                <div className="csa-client-meta">Last session: {fmtLastSession(c.lastSessionDate)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
