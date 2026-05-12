// src/components/AddInvoiceModal.jsx
import { useMemo, useState } from 'react'
import { X, Trash2, Plus, ArrowLeft } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useBilling, SERVICES } from '../context/BillingContext'
import ClientSearchOrAdd from './ClientSearchOrAdd'
import './AddInvoiceModal.css'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function addDays(dateStr, days) {
  const d = new Date(dateStr); d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function emptyLine() {
  const def = SERVICES[0]
  return { serviceId: def.id, label: def.label, duration: def.duration, quantity: 1, price: def.price }
}

export default function AddInvoiceModal({ onClose, preselectedClientId = null }) {
  const { getClient, addClient } = useClients()
  const { addInvoice } = useBilling()

  const [step, setStep] = useState(preselectedClientId ? 2 : 1)
  const [selectedClient, setSelectedClient] = useState(preselectedClientId ? getClient(preselectedClientId) : null)
  const [issueDate, setIssueDate] = useState(todayStr())
  const [dueDate,   setDueDate]   = useState(addDays(todayStr(), 7))
  const [notes,     setNotes]     = useState('')
  const [lineItems, setLineItems] = useState([emptyLine()])

  const total = useMemo(
    () => lineItems.reduce((sum, li) => sum + (Number(li.quantity) * Number(li.price)), 0),
    [lineItems]
  )

  function pickClient(c) {
    setSelectedClient(c)
    setStep(2)
  }

  function createNewClient({ firstName, lastName }) {
    const c = addClient({ firstName, lastName })
    pickClient(c)
  }

  function updateLine(idx, patch) {
    setLineItems(items => items.map((li, i) => {
      if (i !== idx) return li
      // If serviceId changed, refill label/duration/price from defaults
      if (patch.serviceId && patch.serviceId !== li.serviceId) {
        const s = SERVICES.find(x => x.id === patch.serviceId)
        return { ...li, ...patch, label: s.label, duration: s.duration, price: s.price }
      }
      return { ...li, ...patch }
    }))
  }

  function removeLine(idx) {
    setLineItems(items => items.filter((_, i) => i !== idx))
  }

  function addLine() {
    setLineItems(items => [...items, emptyLine()])
  }

  function handleSave() {
    if (!selectedClient) return
    if (lineItems.length === 0) { alert('Add at least one service line.'); return }
    addInvoice({
      clientId: selectedClient.id,
      lineItems,
      issueDate,
      dueDate,
      notes,
    })
    onClose()
  }

  return (
    <div className="aim-backdrop" onClick={onClose}>
      <div className="aim-panel" onClick={e => e.stopPropagation()}>
        <header className="aim-header">
          <div className="aim-header-left">
            {step === 2 && !preselectedClientId && (
              <button className="aim-back" onClick={() => setStep(1)} aria-label="Back">
                <ArrowLeft size={14} />
              </button>
            )}
            <span className="aim-title">New Invoice</span>
          </div>
          <button className="aim-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        {step === 1 && (
          <div className="aim-body">
            <p className="aim-sub">Search for an existing client or add a new one.</p>
            <ClientSearchOrAdd
              onSelect={pickClient}
              onCreate={createNewClient}
              placeholder="Type to search or add…"
              autoFocus
            />
          </div>
        )}

        {step === 2 && selectedClient && (
          <div className="aim-body">
            <div className="aim-client-pill">
              <div className="aim-client-avatar" style={{ background: selectedClient.colour }}>
                {selectedClient.initials}
              </div>
              <div>
                <div className="aim-client-name">{selectedClient.firstName} {selectedClient.lastName}</div>
                <div className="aim-client-meta">{selectedClient.email || '—'}</div>
              </div>
            </div>

            <div className="aim-field-row">
              <label className="aim-field">
                <span className="aim-label">Issue date</span>
                <input type="date" className="aim-input" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </label>
              <label className="aim-field">
                <span className="aim-label">Due date</span>
                <input type="date" className="aim-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </label>
            </div>

            <div className="aim-lines">
              <div className="aim-lines-head">
                <span>Services</span>
                <button className="aim-add-line" onClick={addLine}><Plus size={12} /> Add service</button>
              </div>

              {lineItems.map((li, idx) => (
                <div className="aim-line" key={idx}>
                  <select
                    className="aim-line-service"
                    value={li.serviceId}
                    onChange={e => updateLine(idx, { serviceId: e.target.value })}
                  >
                    {SERVICES.map(s => (
                      <option key={s.id} value={s.id}>{s.label} ({s.duration} min)</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="aim-line-qty"
                    value={li.quantity}
                    onChange={e => updateLine(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    aria-label="Quantity"
                  />
                  <div className="aim-line-price">
                    <span className="aim-currency">₹</span>
                    <input
                      type="number"
                      min="0"
                      className="aim-line-price-input"
                      value={li.price}
                      onChange={e => updateLine(idx, { price: Number(e.target.value) || 0 })}
                      aria-label="Price"
                    />
                  </div>
                  <button
                    className="aim-line-remove"
                    onClick={() => removeLine(idx)}
                    disabled={lineItems.length === 1}
                    aria-label="Remove line"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="aim-total-row">
                <span>Total</span>
                <span className="aim-total-amount">₹ {total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <label className="aim-field">
              <span className="aim-label">Notes (optional)</span>
              <textarea
                className="aim-textarea"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal note for this invoice…"
              />
            </label>

            <div className="aim-footer">
              <button className="aim-secondary" onClick={onClose}>Cancel</button>
              <button className="aim-primary" onClick={handleSave}>Create Invoice (Draft)</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
