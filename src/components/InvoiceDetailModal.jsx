// src/components/InvoiceDetailModal.jsx
import { useState } from 'react'
import { X, CheckCircle2, XCircle, Banknote, Smartphone, CreditCard } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useBilling, totalForInvoice } from '../context/BillingContext'
import './InvoiceDetailModal.css'

const STATUS_LABEL = {
  draft:     { label: 'Draft',     cls: 'idm-pill-neutral' },
  sent:      { label: 'Due',       cls: 'idm-pill-amber'   },
  paid:      { label: 'Paid',      cls: 'idm-pill-green'   },
  cancelled: { label: 'Cancelled', cls: 'idm-pill-slate'   },
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, requiresTxn: false },
  { id: 'upi',  label: 'UPI',  icon: Smartphone, requiresTxn: true },
  { id: 'card', label: 'Card', icon: CreditCard, requiresTxn: true },
]

function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function InvoiceDetailModal({ invoiceId, onClose, onInvoicePaid = () => {} }) {
  const { getInvoice, markPaid, cancelInvoice, sendInvoice } = useBilling()
  const { getClient } = useClients()
  const invoice = getInvoice(invoiceId)
  const client = invoice ? getClient(invoice.clientId) : null

  const [showPay, setShowPay] = useState(false)
  const [method, setMethod]   = useState('cash')
  const [txnId, setTxnId]     = useState('')

  if (!invoice) {
    return (
      <div className="idm-backdrop" onClick={onClose}>
        <div className="idm-panel" onClick={e => e.stopPropagation()}>
          <header className="idm-header">
            <span className="idm-title">Invoice not found</span>
            <button className="idm-close" onClick={onClose}><X size={16} /></button>
          </header>
        </div>
      </div>
    )
  }

  const cfg = STATUS_LABEL[invoice.status] || STATUS_LABEL.draft
  const total = totalForInvoice(invoice)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = invoice.status === 'sent' && invoice.dueDate && invoice.dueDate < today

  function handleMarkPaid() {
    const needsTxn = PAYMENT_METHODS.find(p => p.id === method)?.requiresTxn
    if (needsTxn && !txnId.trim()) {
      alert('Transaction ID is required for UPI / Card payments.')
      return
    }
    markPaid(invoice.id, { method, txnId: txnId.trim() })
    onInvoicePaid(invoice.id, total)
    setShowPay(false)
    setTxnId('')
  }

  function handleSend() {
    sendInvoice(invoice.id)
  }

  function handleCancel() {
    if (confirm(`Cancel invoice ${invoice.code}?`)) {
      cancelInvoice(invoice.id)
    }
  }

  return (
    <div className="idm-backdrop" onClick={onClose}>
      <div className="idm-panel" onClick={e => e.stopPropagation()}>
        <header className="idm-header">
          <div className="idm-header-left">
            <span className="idm-title">{invoice.code}</span>
            <span className={`idm-pill ${cfg.cls}`}>{overdue ? 'Overdue' : cfg.label}</span>
          </div>
          <button className="idm-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="idm-body">
          <section className="idm-row">
            <div>
              <div className="idm-label">Client</div>
              <div className="idm-value">
                <span className="idm-avatar" style={{ background: client?.colour }}>{client?.initials}</span>
                {client ? `${client.firstName} ${client.lastName}` : 'Unknown client'}
              </div>
            </div>
            <div>
              <div className="idm-label">Issue date</div>
              <div className="idm-value">{fmt(invoice.issueDate)}</div>
            </div>
            <div>
              <div className="idm-label">Due date</div>
              <div className="idm-value">{fmt(invoice.dueDate)}</div>
            </div>
          </section>

          <section className="idm-line-table">
            <div className="idm-line-head">
              <span>Service</span>
              <span className="idm-r">Qty</span>
              <span className="idm-r">Price</span>
              <span className="idm-r">Amount</span>
            </div>
            {invoice.lineItems.map((li, idx) => (
              <div className="idm-line-row" key={idx}>
                <span>
                  {li.label}
                  {li.duration ? <span className="idm-line-meta"> · {li.duration} min</span> : null}
                </span>
                <span className="idm-r">{li.quantity}</span>
                <span className="idm-r">₹ {li.price.toLocaleString('en-IN')}</span>
                <span className="idm-r">₹ {(li.price * li.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="idm-line-total">
              <span>Total</span>
              <span>₹ {total.toLocaleString('en-IN')}</span>
            </div>
          </section>

          {invoice.notes && (
            <section>
              <div className="idm-label">Notes</div>
              <div className="idm-notes">{invoice.notes}</div>
            </section>
          )}

          {invoice.payment && (
            <section className="idm-payment-card">
              <div className="idm-label">Payment</div>
              <div className="idm-payment-row">
                <CheckCircle2 size={14} />
                <span>
                  ₹ {invoice.payment.amount.toLocaleString('en-IN')} via {invoice.payment.method.toUpperCase()}
                  {invoice.payment.txnId ? ` · ${invoice.payment.txnId}` : ''} · {fmt(invoice.payment.paidAt)}
                </span>
              </div>
            </section>
          )}

          {showPay && (
            <section className="idm-pay-form">
              <div className="idm-label">Mark as paid — collect manually</div>
              <div className="idm-method-row">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      className={`idm-method ${method === m.id ? 'selected' : ''}`}
                      onClick={() => setMethod(m.id)}
                    >
                      <Icon size={14} /> {m.label}
                    </button>
                  )
                })}
              </div>
              {PAYMENT_METHODS.find(m => m.id === method)?.requiresTxn && (
                <input
                  className="idm-input"
                  placeholder={`${method.toUpperCase()} transaction ID`}
                  value={txnId}
                  onChange={e => setTxnId(e.target.value)}
                />
              )}
              <div className="idm-pay-actions">
                <button className="idm-secondary" onClick={() => setShowPay(false)}>Cancel</button>
                <button className="idm-primary" onClick={handleMarkPaid}>Confirm payment</button>
              </div>
            </section>
          )}
        </div>

        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && !showPay && (
          <footer className="idm-footer">
            <button className="idm-danger" onClick={handleCancel}>
              <XCircle size={14} /> Cancel invoice
            </button>
            <div className="idm-footer-right">
              {invoice.status === 'draft' && (
                <button className="idm-secondary" onClick={handleSend}>Send to client</button>
              )}
              <button className="idm-primary" onClick={() => setShowPay(true)}>
                <CheckCircle2 size={14} /> Mark as paid
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
