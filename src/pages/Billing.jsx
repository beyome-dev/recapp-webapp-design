// src/pages/Billing.jsx
import { useMemo, useState } from 'react'
import { Plus, Search, AlertTriangle, Clock3, CheckCircle2 } from 'lucide-react'
import { useBilling, bucketFor, totalForInvoice } from '../context/BillingContext'
import { useClients } from '../context/ClientsContext'
import AddInvoiceModal from '../components/AddInvoiceModal'
import InvoiceDetailModal from '../components/InvoiceDetailModal'
import './Billing.css'

const STATUS_FILTERS = ['All', 'Paid', 'Due', 'Draft', 'Cancelled']

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function inDateRange(invoice, fromStr, toStr) {
  if (!fromStr && !toStr) return true
  const d = invoice.issueDate
  if (fromStr && d < fromStr) return false
  if (toStr   && d > toStr)   return false
  return true
}

function matchesStatus(invoice, filter, today) {
  if (filter === 'All') return true
  if (filter === 'Paid')      return invoice.status === 'paid'
  if (filter === 'Draft')     return invoice.status === 'draft'
  if (filter === 'Cancelled') return invoice.status === 'cancelled'
  if (filter === 'Due')       return invoice.status === 'sent' && invoice.dueDate && invoice.dueDate < today
  return true
}

const STATUS_BADGE = {
  paid:      { label: 'Paid',      cls: 'bbadge-green'   },
  sent:      { label: 'Sent',      cls: 'bbadge-amber'   },
  draft:     { label: 'Draft',     cls: 'bbadge-neutral' },
  cancelled: { label: 'Cancelled', cls: 'bbadge-slate'   },
}

export default function Billing() {
  const { invoices, totals } = useBilling()
  const { getClient } = useClients()

  const [filter, setFilter]     = useState('All')
  const [query, setQuery]       = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [openInvoiceId, setOpenInvoiceId] = useState(null)

  const today = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter(inv => {
      if (!matchesStatus(inv, filter, today)) return false
      if (!inDateRange(inv, fromDate, toDate)) return false
      if (q) {
        const client = getClient(inv.clientId)
        const haystack = [
          client?.firstName, client?.lastName, client?.name,
          inv.code,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [invoices, filter, fromDate, toDate, query, today, getClient])

  const buckets = useMemo(() => {
    const out = { 'needs-action': [], 'in-progress': [], completed: [] }
    for (const inv of filtered) out[bucketFor(inv, today)].push(inv)
    // sort each bucket by issue date desc
    for (const key of Object.keys(out)) {
      out[key].sort((a, b) => (b.issueDate > a.issueDate ? 1 : -1))
    }
    return out
  }, [filtered, today])

  return (
    <div className="billing-page">
      <header className="billing-header">
        <div>
          <h1 className="billing-title">Billing</h1>
          <p className="billing-subtitle">
            {invoices.length} invoices · {buckets['needs-action'].length} need action
          </p>
        </div>
        <button className="btn-new-invoice" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Invoice
        </button>
      </header>

      <div className="billing-summary">
        <SummaryCard label="Total billed" amount={totals.billed} tone="ink" />
        <SummaryCard label="Paid"         amount={totals.paid}        tone="green" />
        <SummaryCard label="Outstanding"  amount={totals.outstanding} tone="amber" />
      </div>

      <div className="billing-toolbar">
        <div className="billing-search-wrap">
          <Search size={14} />
          <input
            className="billing-search"
            placeholder="Search by client or invoice #…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="billing-date-range">
          <input
            type="date"
            className="billing-date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            aria-label="From date"
          />
          <span className="billing-date-sep">→</span>
          <input
            type="date"
            className="billing-date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            aria-label="To date"
          />
        </div>
        <div className="billing-filters">
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

      <Section
        title="Needs action"
        icon={AlertTriangle}
        tone="warn"
        invoices={buckets['needs-action']}
        emptyHint="No overdue payments."
        getClient={getClient}
        onOpen={setOpenInvoiceId}
        today={today}
      />
      <Section
        title="In progress"
        icon={Clock3}
        tone="info"
        invoices={buckets['in-progress']}
        emptyHint="No active invoices."
        getClient={getClient}
        onOpen={setOpenInvoiceId}
        today={today}
      />
      <Section
        title="Completed"
        icon={CheckCircle2}
        tone="muted"
        invoices={buckets.completed}
        emptyHint="No completed invoices yet."
        getClient={getClient}
        onOpen={setOpenInvoiceId}
        today={today}
      />

      {showAdd && <AddInvoiceModal onClose={() => setShowAdd(false)} />}
      {openInvoiceId && (
        <InvoiceDetailModal
          invoiceId={openInvoiceId}
          onClose={() => setOpenInvoiceId(null)}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, amount, tone }) {
  return (
    <div className={`summary-card summary-${tone}`}>
      <div className="summary-label">{label}</div>
      <div className="summary-amount">₹ {amount.toLocaleString('en-IN')}</div>
    </div>
  )
}

function Section({ title, icon: Icon, tone, invoices, emptyHint, getClient, onOpen, today }) {
  return (
    <section className="billing-section">
      <header className={`billing-section-head tone-${tone}`}>
        <Icon size={14} />
        <h2 className="billing-section-title">{title}</h2>
        <span className="billing-section-count">{invoices.length}</span>
      </header>
      {invoices.length === 0 ? (
        <div className="billing-section-empty">{emptyHint}</div>
      ) : (
        <div className="invoice-list">
          {invoices.map(inv => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              client={getClient(inv.clientId)}
              today={today}
              onOpen={() => onOpen(inv.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function InvoiceRow({ invoice, client, onOpen, today, dense = false }) {
  const cfg = STATUS_BADGE[invoice.status] || STATUS_BADGE.draft
  const overdue = invoice.status === 'sent' && invoice.dueDate && invoice.dueDate < today
  const total = totalForInvoice(invoice)
  const services = invoice.lineItems.map(li => li.label).join(' + ')

  return (
    <div
      className={`invoice-row ${dense ? 'invoice-row-dense' : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className="invoice-code">
        <span className="invoice-code-text">{invoice.code}</span>
        <span className={`invoice-status ${cfg.cls}`}>
          {overdue ? 'Overdue' : cfg.label}
        </span>
      </div>
      <div className="invoice-client-cell">
        {client ? (
          <>
            <div className="invoice-avatar" style={{ background: client.colour }}>{client.initials}</div>
            <span className="invoice-client-name">{client.firstName} {client.lastName}</span>
          </>
        ) : (
          <span className="invoice-client-unknown">Unknown client</span>
        )}
      </div>
      <div className="invoice-services">{services || '—'}</div>
      <div className="invoice-dates">
        <div className="invoice-issue">{fmt(invoice.issueDate)}</div>
        <div className="invoice-due">Due {fmt(invoice.dueDate)}</div>
      </div>
      <div className="invoice-amount">₹ {total.toLocaleString('en-IN')}</div>
    </div>
  )
}
