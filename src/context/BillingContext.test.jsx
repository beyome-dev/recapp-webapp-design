// src/context/BillingContext.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { BillingProvider, useBilling, bucketFor, totalForInvoice, SERVICES } from './BillingContext'

function renderBilling() {
  const wrapper = ({ children }) => <BillingProvider>{children}</BillingProvider>
  return renderHook(() => useBilling(), { wrapper })
}

describe('BillingContext — seed', () => {
  it('seeds 12 invoices with expected shape', () => {
    const { result } = renderBilling()
    expect(result.current.invoices).toHaveLength(12)
    const first = result.current.invoices.find(i => i.id === 'inv-001')
    expect(first).toMatchObject({
      code: 'INV-0001',
      clientId: 'c1',
      status: 'paid',
    })
    expect(first.lineItems).toHaveLength(1)
    expect(first.payment.method).toBe('card')
  })

  it('covers all four statuses across seed', () => {
    const { result } = renderBilling()
    const statuses = new Set(result.current.invoices.map(i => i.status))
    expect(statuses).toEqual(new Set(['draft', 'sent', 'paid', 'cancelled']))
  })
})

describe('BillingContext — totals', () => {
  it('computes billed / paid / outstanding correctly and excludes cancelled', () => {
    const { result } = renderBilling()
    const { billed, paid, outstanding } = result.current.totals
    // Compute manually to check
    const live = result.current.invoices.filter(i => i.status !== 'cancelled')
    const expectedBilled = live.reduce((s, i) => s + totalForInvoice(i), 0)
    const expectedPaid = live.filter(i => i.status === 'paid').reduce((s, i) => s + totalForInvoice(i), 0)
    expect(billed).toBe(expectedBilled)
    expect(paid).toBe(expectedPaid)
    expect(outstanding).toBe(expectedBilled - expectedPaid)
    // Cancelled (inv-009) is excluded from billed
    const cancelled = result.current.invoices.find(i => i.status === 'cancelled')
    expect(totalForInvoice(cancelled)).toBeGreaterThan(0) // it has a real amount
    // ...but billed total doesn't count it
    expect(billed).toBeLessThan(expectedBilled + totalForInvoice(cancelled))
  })
})

describe('BillingContext — totalForInvoice', () => {
  it('multiplies quantity * price per line and sums', () => {
    const inv = {
      lineItems: [
        { quantity: 1, price: 1750 },
        { quantity: 2, price: 3500 },
        { quantity: 1, price: 500 },
      ],
    }
    expect(totalForInvoice(inv)).toBe(1750 + 7000 + 500)
  })

  it('returns 0 for missing or empty lineItems', () => {
    expect(totalForInvoice(null)).toBe(0)
    expect(totalForInvoice({})).toBe(0)
    expect(totalForInvoice({ lineItems: [] })).toBe(0)
  })
})

describe('BillingContext — bucketFor', () => {
  it('puts paid and cancelled in completed', () => {
    expect(bucketFor({ status: 'paid', dueDate: '2026-05-01' }, '2026-05-12')).toBe('completed')
    expect(bucketFor({ status: 'cancelled' }, '2026-05-12')).toBe('completed')
  })

  it('puts overdue sent invoices in needs-action', () => {
    expect(bucketFor({ status: 'sent', dueDate: '2026-05-05' }, '2026-05-12')).toBe('needs-action')
  })

  it('puts current sent invoices in in-progress', () => {
    expect(bucketFor({ status: 'sent', dueDate: '2026-05-20' }, '2026-05-12')).toBe('in-progress')
  })

  it('puts drafts in in-progress regardless of due date', () => {
    expect(bucketFor({ status: 'draft', dueDate: '2026-05-01' }, '2026-05-12')).toBe('in-progress')
    expect(bucketFor({ status: 'draft', dueDate: '2026-05-20' }, '2026-05-12')).toBe('in-progress')
  })
})

describe('BillingContext — addInvoice', () => {
  it('appends a new invoice with synthesised id/code and a 7-day due date', () => {
    const { result } = renderBilling()
    const initialLen = result.current.invoices.length
    let created
    act(() => {
      created = result.current.addInvoice({
        clientId: 'c1',
        lineItems: [{ serviceId: 'svc1' }],
        issueDate: '2026-05-12',
      })
    })
    expect(result.current.invoices).toHaveLength(initialLen + 1)
    expect(created.clientId).toBe('c1')
    expect(created.code).toMatch(/^INV-\d{4}$/)
    expect(created.status).toBe('draft')
    expect(created.issueDate).toBe('2026-05-12')
    expect(created.dueDate).toBe('2026-05-19') // +7 days
    expect(created.lineItems[0]).toMatchObject({
      serviceId: 'svc1',
      label: 'Individual Therapy',
      duration: 50,
      quantity: 1,
      price: 1750,
    })
  })

  it('fills missing line-item fields from the SERVICES table', () => {
    const { result } = renderBilling()
    let created
    act(() => {
      created = result.current.addInvoice({
        clientId: 'c2',
        lineItems: [{ serviceId: 'svc2', quantity: 2 }],
      })
    })
    expect(created.lineItems[0]).toMatchObject({
      label: 'Couples Therapy',
      duration: 80,
      quantity: 2,
      price: 2800,
    })
    expect(totalForInvoice(created)).toBe(5600)
  })

  it('respects price overrides on line items', () => {
    const { result } = renderBilling()
    let created
    act(() => {
      created = result.current.addInvoice({
        clientId: 'c3',
        lineItems: [{ serviceId: 'svc1', price: 1000 }],
      })
    })
    expect(created.lineItems[0].price).toBe(1000)
    expect(totalForInvoice(created)).toBe(1000)
  })

  it('supports multi-service invoices', () => {
    const { result } = renderBilling()
    let created
    act(() => {
      created = result.current.addInvoice({
        clientId: 'c1',
        lineItems: [
          { serviceId: 'svc1' },
          { serviceId: 'svc3' },
        ],
      })
    })
    expect(created.lineItems).toHaveLength(2)
    expect(totalForInvoice(created)).toBe(1750 + 3500)
  })

  it('defaults issueDate to today when omitted', () => {
    const { result } = renderBilling()
    const today = new Date().toISOString().slice(0, 10)
    let created
    act(() => {
      created = result.current.addInvoice({ clientId: 'c1', lineItems: [{ serviceId: 'svc1' }] })
    })
    expect(created.issueDate).toBe(today)
  })
})

describe('BillingContext — sendInvoice', () => {
  it('transitions draft → sent', () => {
    const { result } = renderBilling()
    let created
    act(() => {
      created = result.current.addInvoice({ clientId: 'c1', lineItems: [{ serviceId: 'svc1' }] })
    })
    expect(created.status).toBe('draft')
    act(() => {
      result.current.sendInvoice(created.id)
    })
    expect(result.current.getInvoice(created.id).status).toBe('sent')
  })
})

describe('BillingContext — markPaid', () => {
  it('marks invoice paid with payment details and sets amount', () => {
    const { result } = renderBilling()
    const sentInv = result.current.invoices.find(i => i.status === 'sent')
    const amount = totalForInvoice(sentInv)
    act(() => {
      result.current.markPaid(sentInv.id, { method: 'upi', txnId: 'UPI-XYZ-001' })
    })
    const updated = result.current.getInvoice(sentInv.id)
    expect(updated.status).toBe('paid')
    expect(updated.payment).toMatchObject({
      method: 'upi',
      txnId: 'UPI-XYZ-001',
      amount,
    })
    expect(updated.payment.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('accepts cash payment with empty txnId', () => {
    const { result } = renderBilling()
    const sentInv = result.current.invoices.find(i => i.status === 'sent')
    act(() => {
      result.current.markPaid(sentInv.id, { method: 'cash', txnId: '' })
    })
    const updated = result.current.getInvoice(sentInv.id)
    expect(updated.status).toBe('paid')
    expect(updated.payment.method).toBe('cash')
    expect(updated.payment.txnId).toBe('')
  })
})

describe('BillingContext — cancelInvoice', () => {
  it('marks invoice cancelled and stores reason', () => {
    const { result } = renderBilling()
    const draft = result.current.invoices.find(i => i.status === 'draft')
    act(() => {
      result.current.cancelInvoice(draft.id, 'Client paused therapy')
    })
    const updated = result.current.getInvoice(draft.id)
    expect(updated.status).toBe('cancelled')
    expect(updated.notes).toBe('Client paused therapy')
  })
})

describe('BillingContext — invoicesByClient', () => {
  it('returns only invoices for a given client', () => {
    const { result } = renderBilling()
    const c1List = result.current.invoicesByClient('c1')
    expect(c1List.length).toBeGreaterThan(0)
    expect(c1List.every(i => i.clientId === 'c1')).toBe(true)
  })

  it('returns empty array for unknown client', () => {
    const { result } = renderBilling()
    expect(result.current.invoicesByClient('does-not-exist')).toEqual([])
  })
})

describe('SERVICES catalog', () => {
  it('exposes price, label, duration for every service', () => {
    expect(SERVICES.length).toBeGreaterThan(0)
    for (const s of SERVICES) {
      expect(s).toEqual(expect.objectContaining({
        id: expect.any(String),
        label: expect.any(String),
        duration: expect.any(Number),
        price: expect.any(Number),
      }))
      expect(s.price).toBeGreaterThan(0)
    }
  })
})
