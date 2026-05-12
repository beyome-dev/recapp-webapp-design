// src/components/AddInvoiceModal.test.jsx
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { AllProviders } from '../test/test-utils'
import { render } from '@testing-library/react'
import { useBilling } from '../context/BillingContext'
import AddInvoiceModal from './AddInvoiceModal'

// Mounts the modal alongside a hook-spy so tests can read the invoice list
// after addInvoice fires.
function renderModal({ onClose = vi.fn(), preselectedClientId = null } = {}) {
  const billingRef = { current: null }
  function BillingSpy() {
    billingRef.current = useBilling()
    return null
  }
  const utils = render(
    <AllProviders>
      <BillingSpy />
      <AddInvoiceModal onClose={onClose} preselectedClientId={preselectedClientId} />
    </AllProviders>
  )
  return { ...utils, onClose, billingRef }
}

describe('<AddInvoiceModal>', () => {
  it('opens on step 1 (client search) when no preselectedClient', () => {
    renderModal()
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
    expect(screen.getByText(/Search for an existing client/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Type to search/i)).toBeInTheDocument()
  })

  it('skips to step 2 when preselectedClientId is provided', () => {
    renderModal({ preselectedClientId: 'c1' })
    // step 2 specific: dates, services
    expect(screen.getByText('Issue date')).toBeInTheDocument()
    expect(screen.getByText('Due date')).toBeInTheDocument()
    expect(screen.getByText('Services')).toBeInTheDocument()
    // client pill shows the preselected client
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
  })

  it('transitions step 1 → 2 when a client is picked', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText('Arjun S.'))
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
    expect(screen.getByText('Services')).toBeInTheDocument()
  })

  it('back arrow returns to step 1', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText('Arjun S.'))
    await user.click(screen.getByLabelText('Back'))
    expect(screen.getByText(/Search for an existing client/i)).toBeInTheDocument()
  })

  it('default line item shows Individual Therapy at ₹1750 and total matches', () => {
    renderModal({ preselectedClientId: 'c1' })
    const select = screen.getByRole('combobox')
    expect(select.value).toBe('svc1')
    expect(screen.getByDisplayValue('1750')).toBeInTheDocument() // price input
    expect(screen.getByText('₹ 1,750')).toBeInTheDocument()       // total
  })

  it('changing service refills price from SERVICES table', async () => {
    const user = userEvent.setup()
    renderModal({ preselectedClientId: 'c1' })
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'svc3') // Assessment, ₹3500
    expect(screen.getByDisplayValue('3500')).toBeInTheDocument()
    expect(screen.getByText('₹ 3,500')).toBeInTheDocument()
  })

  it('adds and removes service line items, recalculating total', async () => {
    const user = userEvent.setup()
    renderModal({ preselectedClientId: 'c1' })
    // start with one line, total 1750
    expect(screen.getByText('₹ 1,750')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Add service/i }))
    // now two lines (both svc1 default), total 3500
    expect(screen.getByText('₹ 3,500')).toBeInTheDocument()
    const removeButtons = screen.getAllByLabelText('Remove line')
    expect(removeButtons).toHaveLength(2)

    // Remove the first line
    await user.click(removeButtons[0])
    expect(screen.getByText('₹ 1,750')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Remove line')).toHaveLength(1)
  })

  it('disables the remove button when there is only one line', () => {
    renderModal({ preselectedClientId: 'c1' })
    const removeBtn = screen.getByLabelText('Remove line')
    expect(removeBtn).toBeDisabled()
  })

  it('saving creates a draft invoice and closes the modal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { billingRef } = renderModal({ onClose, preselectedClientId: 'c1' })

    const initialCount = billingRef.current.invoices.length

    // Change one line, add another
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'svc2') // Couples Therapy, ₹2800
    await user.click(screen.getByRole('button', { name: /Add service/i }))
    // Pick the second service select
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[1], 'svc3') // Assessment ₹3500

    // Total = 2800 + 3500 = 6300
    expect(screen.getByText('₹ 6,300')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Create Invoice/i }))

    expect(onClose).toHaveBeenCalled()
    expect(billingRef.current.invoices.length).toBe(initialCount + 1)
    const created = billingRef.current.invoices[billingRef.current.invoices.length - 1]
    expect(created.clientId).toBe('c1')
    expect(created.lineItems).toHaveLength(2)
    expect(created.lineItems.map(li => li.serviceId).sort()).toEqual(['svc2', 'svc3'])
    expect(created.status).toBe('draft')
  })

  it('cancel button closes without saving', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { billingRef } = renderModal({ onClose, preselectedClientId: 'c1' })
    const initialCount = billingRef.current.invoices.length
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(billingRef.current.invoices.length).toBe(initialCount)
  })

  it('close button (X) closes without saving', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose, preselectedClientId: 'c1' })
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })
})
