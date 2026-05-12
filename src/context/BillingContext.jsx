// src/context/BillingContext.jsx
//
// Frontend-only invoices model — backend has no `invoices` collection.
// See docs/contradictions.md row 6 for context.

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// ── Services + pricing ─────────────────────────────────────────────────────
export const SERVICES = [
  { id: 'svc1', label: 'Individual Therapy', duration: 50, price: 1750 },
  { id: 'svc2', label: 'Couples Therapy',    duration: 80, price: 2800 },
  { id: 'svc3', label: 'Assessment',         duration: 90, price: 3500 },
  { id: 'svc4', label: 'Group Therapy',      duration: 60, price: 1200 },
]

export function serviceLabel(id) {
  const s = SERVICES.find(s => s.id === id)
  return s ? `${s.label} (${s.duration} min)` : id
}

// ── Helpers ────────────────────────────────────────────────────────────────
function makeInvoiceCode(seq) {
  return `INV-${String(seq).padStart(4, '0')}`
}

function totalFor(lineItems) {
  return lineItems.reduce((sum, li) => sum + (li.quantity * li.price), 0)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Seed ───────────────────────────────────────────────────────────────────
function mkLine(serviceId, quantity = 1, overridePrice = null) {
  const s = SERVICES.find(x => x.id === serviceId)
  return {
    serviceId,
    label: s.label,
    duration: s.duration,
    quantity,
    price: overridePrice ?? s.price,
  }
}

const SEED_INVOICES = [
  {
    id: 'inv-001', code: 'INV-0001', clientId: 'c1',
    lineItems: [mkLine('svc1')],
    issueDate: '2026-05-07', dueDate: '2026-05-14',
    status: 'paid',
    payment: { method: 'card', txnId: 'TXN-44188', paidAt: '2026-05-07', amount: 1750 },
    notes: '',
  },
  {
    id: 'inv-002', code: 'INV-0002', clientId: 'c1',
    lineItems: [mkLine('svc1')],
    issueDate: '2026-05-07', dueDate: '2026-05-14',
    status: 'draft',
    payment: null,
    notes: 'Pending therapist review',
  },
  {
    id: 'inv-003', code: 'INV-0003', clientId: 'c2',
    lineItems: [mkLine('svc2')],
    issueDate: '2026-05-06', dueDate: '2026-05-13',
    status: 'sent',
    payment: null,
    notes: '',
  },
  {
    id: 'inv-004', code: 'INV-0004', clientId: 'c4',
    lineItems: [mkLine('svc1')],
    issueDate: '2026-04-28', dueDate: '2026-05-05', // overdue (today: 2026-05-12)
    status: 'sent',
    payment: null,
    notes: '',
  },
  {
    id: 'inv-005', code: 'INV-0005', clientId: 'c8',
    lineItems: [mkLine('svc1'), mkLine('svc3')],
    issueDate: '2026-05-03', dueDate: '2026-05-10', // overdue
    status: 'sent',
    payment: null,
    notes: 'Combined session + assessment',
  },
  {
    id: 'inv-006', code: 'INV-0006', clientId: 'c5',
    lineItems: [mkLine('svc1')],
    issueDate: '2026-04-15', dueDate: '2026-04-22',
    status: 'paid',
    payment: { method: 'upi', txnId: 'UPI-987654321', paidAt: '2026-04-20', amount: 1750 },
    notes: '',
  },
  {
    id: 'inv-007', code: 'INV-0007', clientId: 'c6',
    lineItems: [mkLine('svc1')],
    issueDate: '2026-04-22', dueDate: '2026-04-29',
    status: 'paid',
    payment: { method: 'cash', txnId: '', paidAt: '2026-04-22', amount: 1750 },
    notes: '',
  },
  {
    id: 'inv-008', code: 'INV-0008', clientId: 'c9',
    lineItems: [mkLine('svc1')],
    issueDate: '2026-05-01', dueDate: '2026-05-08', // overdue
    status: 'sent',
    payment: null,
    notes: '',
  },
  {
    id: 'inv-009', code: 'INV-0009', clientId: 'c10',
    lineItems: [mkLine('svc2', 1)],
    issueDate: '2025-11-05', dueDate: '2025-11-12',
    status: 'cancelled',
    payment: null,
    notes: 'Client discharged before session',
  },
  {
    id: 'inv-010', code: 'INV-0010', clientId: 'c7',
    lineItems: [mkLine('svc1')],
    issueDate: '2025-12-10', dueDate: '2025-12-17',
    status: 'paid',
    payment: { method: 'card', txnId: 'TXN-22011', paidAt: '2025-12-12', amount: 1750 },
    notes: '',
  },
  {
    id: 'inv-011', code: 'INV-0011', clientId: 'c2',
    lineItems: [mkLine('svc3')],
    issueDate: '2026-05-09', dueDate: '2026-05-16',
    status: 'draft',
    payment: null,
    notes: 'Assessment add-on, awaiting approval',
  },
  {
    id: 'inv-012', code: 'INV-0012', clientId: 'c1',
    lineItems: [mkLine('svc4')],
    issueDate: '2026-05-10', dueDate: '2026-05-17',
    status: 'sent',
    payment: null,
    notes: '',
  },
]

// ── Bucket helper (Needs Action / In Progress / Completed) ─────────────────
export function bucketFor(invoice, today = todayStr()) {
  const { status, dueDate } = invoice
  if (status === 'paid' || status === 'cancelled') return 'completed'
  if (status === 'sent' && dueDate && dueDate < today) return 'needs-action'
  return 'in-progress'  // covers 'draft' and 'sent' (not yet due)
}

// ── Context ────────────────────────────────────────────────────────────────
const BillingContext = createContext(null)

export function BillingProvider({ children }) {
  const [invoices, setInvoices] = useState(SEED_INVOICES)

  const getInvoice = useCallback(
    (id) => invoices.find(i => i.id === id) ?? null,
    [invoices]
  )

  const addInvoice = useCallback(({ clientId, lineItems, issueDate, dueDate, notes }) => {
    const id = 'inv-' + Date.now()
    const code = `INV-${Date.now().toString().slice(-4)}`
    const items = (lineItems && lineItems.length > 0)
      ? lineItems.map(li => ({
          serviceId: li.serviceId,
          label:     li.label ?? SERVICES.find(s => s.id === li.serviceId)?.label ?? '',
          duration:  li.duration ?? SERVICES.find(s => s.id === li.serviceId)?.duration ?? 0,
          quantity:  li.quantity ?? 1,
          price:     li.price ?? SERVICES.find(s => s.id === li.serviceId)?.price ?? 0,
        }))
      : []
    const issued = issueDate || todayStr()
    const inv = {
      id,
      code,
      clientId,
      lineItems: items,
      issueDate: issued,
      dueDate:   dueDate || addDays(issued, 7),
      status: 'draft',
      payment: null,
      notes: notes || '',
    }
    setInvoices(prev => [...prev, inv])
    return inv
  }, [])

  const updateInvoice = useCallback((id, patch) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }, [])

  const sendInvoice = useCallback((id) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'sent' } : i))
  }, [])

  const markPaid = useCallback((id, { method, txnId }) => {
    setInvoices(prev => prev.map(i => {
      if (i.id !== id) return i
      return {
        ...i,
        status: 'paid',
        payment: {
          method,
          txnId: txnId || '',
          paidAt: todayStr(),
          amount: totalFor(i.lineItems),
        },
      }
    }))
  }, [])

  const cancelInvoice = useCallback((id, reason) => {
    setInvoices(prev => prev.map(i =>
      i.id === id ? { ...i, status: 'cancelled', notes: reason || i.notes } : i
    ))
  }, [])

  const deleteInvoice = useCallback((id) => {
    setInvoices(prev => prev.filter(i => i.id !== id))
  }, [])

  // ── Derived helpers ──────────────────────────────────────────────────────
  const invoicesByClient = useCallback(
    (clientId) => invoices.filter(i => i.clientId === clientId),
    [invoices]
  )

  const totals = useMemo(() => {
    let billed = 0, paid = 0, outstanding = 0
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue
      const t = totalFor(inv.lineItems)
      billed += t
      if (inv.status === 'paid') paid += t
      else outstanding += t
    }
    return { billed, paid, outstanding }
  }, [invoices])

  const value = useMemo(() => ({
    invoices,
    getInvoice,
    addInvoice,
    updateInvoice,
    sendInvoice,
    markPaid,
    cancelInvoice,
    deleteInvoice,
    invoicesByClient,
    totals,
  }), [invoices, getInvoice, addInvoice, updateInvoice, sendInvoice, markPaid, cancelInvoice, deleteInvoice, invoicesByClient, totals])

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling() {
  const ctx = useContext(BillingContext)
  if (ctx === null) throw new Error('useBilling must be used inside BillingProvider')
  return ctx
}

// Pure helper for tests/callers
export function totalForInvoice(inv) {
  return totalFor(inv?.lineItems || [])
}
