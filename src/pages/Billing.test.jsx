// src/pages/Billing.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import Billing from './Billing'

describe('<Billing> page', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders header with invoice count', () => {
    renderWithProviders(<Billing />)
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByText(/12 invoices/)).toBeInTheDocument()
  })

  it('renders all three summary cards with rupee totals', () => {
    const { container } = renderWithProviders(<Billing />)
    const cards = container.querySelectorAll('.summary-card')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByText('Total billed')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Paid')).toBeInTheDocument()
    expect(within(cards[2]).getByText('Outstanding')).toBeInTheDocument()
    // Each summary card has one rupee amount
    for (const card of cards) {
      expect(within(card).getByText(/^₹ /)).toBeInTheDocument()
    }
  })

  it('renders three sections', () => {
    renderWithProviders(<Billing />)
    expect(screen.getByRole('heading', { name: /Needs action/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /In progress/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Completed/i })).toBeInTheDocument()
  })

  it('puts overdue sent invoices in Needs Action', () => {
    renderWithProviders(<Billing />)
    const needsSection = screen.getByRole('heading', { name: /Needs action/i }).closest('.billing-section')
    // inv-004 (c4 Ananya) and inv-005 (c8 Karthik) and inv-008 (c9 Priya) are overdue
    expect(within(needsSection).getByText('INV-0004')).toBeInTheDocument()
    expect(within(needsSection).getByText('INV-0005')).toBeInTheDocument()
    expect(within(needsSection).getByText('INV-0008')).toBeInTheDocument()
  })

  it('puts paid + cancelled invoices in Completed', () => {
    renderWithProviders(<Billing />)
    const completedSection = screen.getByRole('heading', { name: /Completed/i }).closest('.billing-section')
    expect(within(completedSection).getByText('INV-0001')).toBeInTheDocument() // paid
    expect(within(completedSection).getByText('INV-0009')).toBeInTheDocument() // cancelled
    expect(within(completedSection).getByText('INV-0010')).toBeInTheDocument() // paid
  })

  it('puts drafts + current-sent invoices in In Progress', () => {
    renderWithProviders(<Billing />)
    const inProgSection = screen.getByRole('heading', { name: /In progress/i }).closest('.billing-section')
    expect(within(inProgSection).getByText('INV-0002')).toBeInTheDocument() // draft
    expect(within(inProgSection).getByText('INV-0011')).toBeInTheDocument() // draft
    expect(within(inProgSection).getByText('INV-0003')).toBeInTheDocument() // sent, not overdue
    expect(within(inProgSection).getByText('INV-0012')).toBeInTheDocument() // sent, not overdue
  })

  it('Paid status filter narrows list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.click(screen.getByRole('button', { name: 'Paid' }))
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
    expect(screen.getByText('INV-0006')).toBeInTheDocument()
    expect(screen.queryByText('INV-0002')).not.toBeInTheDocument() // draft
    expect(screen.queryByText('INV-0009')).not.toBeInTheDocument() // cancelled
  })

  it('Draft status filter narrows list to drafts only', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.click(screen.getByRole('button', { name: 'Draft' }))
    expect(screen.getByText('INV-0002')).toBeInTheDocument()
    expect(screen.getByText('INV-0011')).toBeInTheDocument()
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument() // paid
  })

  it('Cancelled status filter narrows to cancelled only', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.click(screen.getByRole('button', { name: 'Cancelled' }))
    expect(screen.getByText('INV-0009')).toBeInTheDocument()
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument()
  })

  it('Due status filter narrows to overdue sent only', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.click(screen.getByRole('button', { name: 'Due' }))
    expect(screen.getByText('INV-0004')).toBeInTheDocument()
    expect(screen.getByText('INV-0005')).toBeInTheDocument()
    expect(screen.queryByText('INV-0003')).not.toBeInTheDocument() // sent but not overdue
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument() // paid
  })

  it('search narrows by client name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.type(screen.getByPlaceholderText(/Search by client/i), 'arjun')
    // Arjun (c1) has invoices INV-0001, INV-0002, INV-0012
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
    expect(screen.getByText('INV-0002')).toBeInTheDocument()
    expect(screen.getByText('INV-0012')).toBeInTheDocument()
    expect(screen.queryByText('INV-0003')).not.toBeInTheDocument() // Meera, not Arjun
  })

  it('search narrows by invoice code', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.type(screen.getByPlaceholderText(/Search by client/i), 'INV-0003')
    expect(screen.getByText('INV-0003')).toBeInTheDocument()
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument()
  })

  it('date range From filter excludes older invoices', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.type(screen.getByLabelText('From date'), '2026-05-01')
    // INV-0010 (issued 2025-12-10) should be hidden
    expect(screen.queryByText('INV-0010')).not.toBeInTheDocument()
    // INV-0001 (issued 2026-05-07) should be visible
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
  })

  it('clicking an invoice row opens the detail modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.click(screen.getByText('INV-0001'))
    // Detail modal has invoice code in its header — find within idm-panel
    const modal = document.querySelector('.idm-panel')
    expect(modal).toBeTruthy()
    expect(within(modal).getByText('INV-0001')).toBeInTheDocument()
    // Payment card shows for paid invoice
    expect(within(modal).getByText(/via CARD/i)).toBeInTheDocument()
  })

  it('Add Invoice button opens the AddInvoiceModal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Billing />)
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    // AddInvoiceModal header
    const aim = document.querySelector('.aim-panel')
    expect(aim).toBeTruthy()
    expect(within(aim).getByText('New Invoice')).toBeInTheDocument()
  })
})
