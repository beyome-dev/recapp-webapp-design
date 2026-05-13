import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ClientsProvider } from '../context/ClientsContext'
import { BillingProvider } from '../context/BillingContext'
import { SessionsProvider } from '../context/SessionsContext'
import SessionNotes from './SessionNotes'

function renderSessionPage(sessionId = 'sess-1') {
  return render(
    <MemoryRouter initialEntries={[`/sessions/${sessionId}`]}>
      <AuthProvider>
        <ClientsProvider>
          <BillingProvider>
            <SessionsProvider>
              <Routes>
                <Route path="/sessions" element={<div>sessions list</div>} />
                <Route path="/sessions/:id" element={<SessionNotes />} />
              </Routes>
            </SessionsProvider>
          </BillingProvider>
        </ClientsProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<SessionNotes> billing tab', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })
  afterEach(() => vi.restoreAllMocks())

  async function openBillingTab() {
    renderSessionPage('sess-1')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Billing' }))
    return user
  }

  it('renders invoice rows in the billing tab', async () => {
    await openBillingTab()
    expect(screen.getByText('inv-001')).toBeInTheDocument()
    expect(screen.getByText('inv-002')).toBeInTheDocument()
  })

  it('clicking an invoice row opens InvoiceDetailModal', async () => {
    const user = await openBillingTab()
    // row shows session-local id "inv-001"; modal header shows billing code "INV-0001"
    await user.click(screen.getByText('inv-001'))
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
  })

  it('InvoiceDetailModal closes when close button is clicked', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByText('inv-001'))
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument()
  })

  it('Add Invoice button opens AddInvoiceModal', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
  })

  it('AddInvoiceModal is pre-populated with the session client', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    // sess-1 belongs to c1 = Arjun Sharma; modal skips to step 2 and shows client name
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
  })

  it('AddInvoiceModal closes when close button is clicked', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('New Invoice')).not.toBeInTheDocument()
  })

  async function payInvoice002() {
    const user = await openBillingTab()
    await user.click(screen.getByText('inv-002'))
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'Cash' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
    return user
  }

  it('invoice badge updates to paid after marking payment', async () => {
    await payInvoice002()
    // The inv-002 card should now show the paid badge
    const badges = screen.getAllByText('paid')
    expect(badges.length).toBe(2) // inv-001 was already paid; inv-002 now also paid
  })

  it('appends a payment activity entry after marking payment', async () => {
    await payInvoice002()
    expect(screen.getByText(/Payment ₹1,750 received for inv-002/)).toBeInTheDocument()
  })

  it('wrap-up billing item flips to Invoice added after full payment', async () => {
    await payInvoice002()
    expect(screen.getByText('Invoice added')).toBeInTheDocument()
    expect(screen.queryByText('Billing pending')).not.toBeInTheDocument()
  })
})

describe('<SessionNotes> finalize button auto-transition', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })
  afterEach(() => vi.restoreAllMocks())

  async function completeAllTasks() {
    renderSessionPage('sess-1')
    const user = userEvent.setup()

    // Task 1: lock the note (PSE is already completed in seed data)
    await user.click(screen.getByRole('button', { name: 'Lock' }))

    // Task 2: pay inv-002 to clear outstanding balance
    await user.click(screen.getByRole('button', { name: 'Billing' }))
    await user.click(screen.getByText('inv-002'))
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'Cash' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    return user
  }

  it('shows "Finalize Session" button when tasks are incomplete', () => {
    renderSessionPage('sess-1')
    // note is unlocked and billing pending — button should be active
    expect(screen.getByRole('button', { name: 'Finalize Session' })).not.toBeDisabled()
  })

  it('shows "Session Finalized" and disables button when all tasks complete', async () => {
    await completeAllTasks()
    expect(screen.getByRole('button', { name: 'Session Finalized' })).toBeDisabled()
  })

  it('hides "Finalize Session" once all tasks are complete', async () => {
    await completeAllTasks()
    expect(screen.queryByRole('button', { name: 'Finalize Session' })).not.toBeInTheDocument()
  })
})
