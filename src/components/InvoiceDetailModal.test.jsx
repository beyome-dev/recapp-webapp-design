// src/components/InvoiceDetailModal.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { AllProviders } from '../test/test-utils'
import { useBilling } from '../context/BillingContext'
import InvoiceDetailModal from './InvoiceDetailModal'

function renderDetail(invoiceId, { onClose = vi.fn(), onInvoicePaid = vi.fn() } = {}) {
  const billingRef = { current: null }
  function Spy() { billingRef.current = useBilling(); return null }
  const utils = render(
    <AllProviders>
      <Spy />
      <InvoiceDetailModal invoiceId={invoiceId} onClose={onClose} onInvoicePaid={onInvoicePaid} />
    </AllProviders>
  )
  return { ...utils, onClose, billingRef, onInvoicePaid }
}

describe('<InvoiceDetailModal>', () => {
  beforeEach(() => {
    // jsdom doesn't implement window.alert or confirm
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders invoice header, client, line items, total', () => {
    renderDetail('inv-001')
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText(/Individual Therapy/)).toBeInTheDocument()
    // total ₹1,750 appears in totals row at least
    expect(screen.getAllByText(/₹ 1,750/).length).toBeGreaterThan(0)
  })

  it('shows the payment card when paid', () => {
    renderDetail('inv-001')
    expect(screen.getByText(/via CARD/i)).toBeInTheDocument()
    expect(screen.getByText(/TXN-44188/)).toBeInTheDocument()
  })

  it('shows Overdue pill for past-due sent invoices', () => {
    // inv-004 is sent, due 2026-05-05, today is 2026-05-12 → overdue
    renderDetail('inv-004')
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('shows Due pill for current sent invoices that are not overdue', () => {
    // inv-012 is sent, issued 2026-05-10, due 2026-05-17 → not overdue
    renderDetail('inv-012')
    expect(screen.getByText('Due')).toBeInTheDocument()
  })

  it('renders "Invoice not found" for an unknown id', () => {
    renderDetail('does-not-exist')
    expect(screen.getByText('Invoice not found')).toBeInTheDocument()
  })

  it('does not show action footer for paid invoices', () => {
    renderDetail('inv-001')
    expect(screen.queryByRole('button', { name: /Mark as paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cancel invoice/i })).not.toBeInTheDocument()
  })

  it('does not show action footer for cancelled invoices', () => {
    renderDetail('inv-009')
    expect(screen.queryByRole('button', { name: /Mark as paid/i })).not.toBeInTheDocument()
  })

  it('Send to client transitions draft → sent', async () => {
    const user = userEvent.setup()
    const { billingRef } = renderDetail('inv-002') // draft
    await user.click(screen.getByRole('button', { name: /Send to client/i }))
    expect(billingRef.current.getInvoice('inv-002').status).toBe('sent')
  })

  it('Mark as paid via UPI requires a transaction ID', async () => {
    const user = userEvent.setup()
    const { billingRef } = renderDetail('inv-003') // sent
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'UPI' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/transaction ID is required/i))
    // No state change
    expect(billingRef.current.getInvoice('inv-003').status).toBe('sent')
  })

  it('Mark as paid via Card requires a transaction ID', async () => {
    const user = userEvent.setup()
    renderDetail('inv-003')
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'Card' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
    expect(window.alert).toHaveBeenCalled()
  })

  it('Mark as paid via Cash works without a transaction ID', async () => {
    const user = userEvent.setup()
    const { billingRef } = renderDetail('inv-003')
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    // 'cash' is the default — but click it anyway
    await user.click(screen.getByRole('button', { name: 'Cash' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
    const updated = billingRef.current.getInvoice('inv-003')
    expect(updated.status).toBe('paid')
    expect(updated.payment.method).toBe('cash')
    expect(updated.payment.txnId).toBe('')
  })

  it('Mark as paid via UPI with txn ID succeeds', async () => {
    const user = userEvent.setup()
    const { billingRef } = renderDetail('inv-003')
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'UPI' }))
    const txnInput = screen.getByPlaceholderText(/UPI transaction ID/i)
    await user.type(txnInput, 'UPI-TEST-9999')
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
    const updated = billingRef.current.getInvoice('inv-003')
    expect(updated.status).toBe('paid')
    expect(updated.payment.method).toBe('upi')
    expect(updated.payment.txnId).toBe('UPI-TEST-9999')
  })

  it('Cancel invoice transitions to cancelled (with confirm dialog)', async () => {
    const user = userEvent.setup()
    const { billingRef } = renderDetail('inv-002') // draft
    await user.click(screen.getByRole('button', { name: /Cancel invoice/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(billingRef.current.getInvoice('inv-002').status).toBe('cancelled')
  })

  it('Cancel invoice respects a no-confirm', async () => {
    window.confirm.mockReturnValueOnce(false)
    const user = userEvent.setup()
    const { billingRef } = renderDetail('inv-002')
    await user.click(screen.getByRole('button', { name: /Cancel invoice/i }))
    expect(billingRef.current.getInvoice('inv-002').status).toBe('draft')
  })

  it('Close (X) calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDetail('inv-001', { onClose })
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onInvoicePaid with invoiceId and total amount after cash payment', async () => {
    const user = userEvent.setup()
    const onInvoicePaid = vi.fn()
    renderDetail('inv-003', { onInvoicePaid })
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'Cash' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
    // inv-003 is a sent invoice with one line item: 1 × ₹1,750
    expect(onInvoicePaid).toHaveBeenCalledOnce()
    expect(onInvoicePaid).toHaveBeenCalledWith('inv-003', 1750)
  })
})
