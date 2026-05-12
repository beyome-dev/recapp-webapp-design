// src/pages/ClientProfile.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ClientsProvider, useClients } from '../context/ClientsContext'
import { BillingProvider } from '../context/BillingContext'
import { SessionsProvider } from '../context/SessionsContext'
import ClientProfile from './ClientProfile'

function ClientsListMock() {
  return <div data-testid="clients-list-mock">clients list</div>
}

function renderProfilePage(clientId = 'c1') {
  const clientsRef = { current: null }
  function Spy() { clientsRef.current = useClients(); return null }
  const utils = render(
    <MemoryRouter initialEntries={[`/clients/${clientId}`]}>
      <AuthProvider>
        <ClientsProvider>
          <BillingProvider>
            <SessionsProvider>
              <Spy />
              <Routes>
                <Route path="/clients" element={<ClientsListMock />} />
                <Route path="/clients/:id" element={<ClientProfile />} />
              </Routes>
            </SessionsProvider>
          </BillingProvider>
        </ClientsProvider>
      </AuthProvider>
    </MemoryRouter>
  )
  return { ...utils, clientsRef }
}

describe('<ClientProfile> page', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders the client header for a valid id', () => {
    renderProfilePage('c1')
    expect(screen.getByRole('heading', { name: /Arjun Sharma/i })).toBeInTheDocument()
    expect(screen.getByText(/C1/)).toBeInTheDocument() // clientCode
  })

  it('shows "Client not found" for an unknown id', () => {
    renderProfilePage('does-not-exist')
    expect(screen.getByText(/Client not found/i)).toBeInTheDocument()
  })

  it('shows all 5 tabs', () => {
    renderProfilePage('c1')
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(5)
    expect(tabs.map(t => t.textContent.trim())).toEqual(['Client', 'Charts', 'Assessment', 'Billing', 'Worksheets'])
  })

  it('tab switch changes the body', async () => {
    const user = userEvent.setup()
    renderProfilePage('c1')
    // Initial: Client tab — Profile details visible
    expect(screen.getByText('Profile details')).toBeInTheDocument()
    // Switch to Assessment
    await user.click(screen.getByRole('tab', { name: /Assessment/i }))
    expect(screen.getByText('Progress chart')).toBeInTheDocument()
    expect(screen.queryByText('Profile details')).not.toBeInTheDocument()
    // Switch to Worksheets
    await user.click(screen.getByRole('tab', { name: /Worksheets/i }))
    expect(screen.getByText('Assigned worksheets')).toBeInTheDocument()
  })

  it('At Risk toggle persists', async () => {
    const user = userEvent.setup()
    const { clientsRef } = renderProfilePage('c1')
    expect(clientsRef.current.getClient('c1').atRisk).toBe(false)
    const toggle = screen.getByRole('checkbox') // the At Risk checkbox
    await user.click(toggle)
    expect(clientsRef.current.getClient('c1').atRisk).toBe(true)
  })

  it('Client tab Edit → mutate → Save persists', async () => {
    const user = userEvent.setup()
    const { clientsRef } = renderProfilePage('c1')

    // Find Profile details card and click Edit
    const profileCard = screen.getByText('Profile details').closest('.ctab-card')
    await user.click(within(profileCard).getByRole('button', { name: /Edit/i }))

    // Update phone field
    const phoneInput = within(profileCard).getByDisplayValue('+91 98200 11122')
    await user.clear(phoneInput)
    await user.type(phoneInput, '+91 99999 88888')

    await user.click(within(profileCard).getByRole('button', { name: /Save/i }))

    expect(clientsRef.current.getClient('c1').phone).toBe('+91 99999 88888')
    // After save, Edit button reappears
    expect(within(profileCard).getByRole('button', { name: /Edit/i })).toBeInTheDocument()
  })

  it('Client tab refuses to save with empty first name', async () => {
    const user = userEvent.setup()
    const { clientsRef } = renderProfilePage('c1')
    const profileCard = screen.getByText('Profile details').closest('.ctab-card')
    await user.click(within(profileCard).getByRole('button', { name: /Edit/i }))
    const firstNameInput = within(profileCard).getByDisplayValue('Arjun')
    await user.clear(firstNameInput)
    await user.click(within(profileCard).getByRole('button', { name: /Save/i }))
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/First name is required/i))
    // No change
    expect(clientsRef.current.getClient('c1').firstName).toBe('Arjun')
  })

  it('Address Edit → Save updates the postal code', async () => {
    const user = userEvent.setup()
    const { clientsRef } = renderProfilePage('c1')
    const addressCard = screen.getByText('Home address').closest('.ctab-card')
    await user.click(within(addressCard).getByRole('button', { name: /Edit/i }))
    const pinInput = within(addressCard).getByDisplayValue('560001')
    await user.clear(pinInput)
    await user.type(pinInput, '560100')
    await user.click(within(addressCard).getByRole('button', { name: /Save/i }))
    expect(clientsRef.current.getClient('c1').demographics.address.postalCode).toBe('560100')
  })

  it('Consent Send → Mark received transitions a consent', async () => {
    const user = userEvent.setup()
    const { clientsRef } = renderProfilePage('c3') // pending consents
    // Therapy Consent first
    const consentCard = screen.getByText(/Consent .+ compliance/i).closest('.ctab-card')
    const therapyRow = within(consentCard).getByText('Therapy Consent').closest('.consent-row')
    await user.click(within(therapyRow).getByRole('button', { name: /Send/i }))

    let consent = clientsRef.current.getClient('c3').consents.find(c => c.type === 'treatment')
    expect(consent.status).toBe('sent')
    expect(consent.sentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Now Mark received should appear in the same row
    await user.click(within(therapyRow).getByRole('button', { name: /Mark received/i }))
    consent = clientsRef.current.getClient('c3').consents.find(c => c.type === 'treatment')
    expect(consent.status).toBe('completed')
    expect(consent.completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('Delete Client removes the client and navigates to /clients', async () => {
    const user = userEvent.setup()
    const { clientsRef } = renderProfilePage('c1')
    expect(clientsRef.current.getClient('c1')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /^Actions/i }))
    await user.click(screen.getByRole('button', { name: /Delete Client/i }))

    expect(window.confirm).toHaveBeenCalled()
    expect(clientsRef.current.getClient('c1')).toBeNull()
    expect(screen.getByTestId('clients-list-mock')).toBeInTheDocument()
  })

  it('Actions menu items (other than Delete) emit "coming next" toast', async () => {
    const user = userEvent.setup()
    renderProfilePage('c1')
    await user.click(screen.getByRole('button', { name: /^Actions/i }))
    await user.click(screen.getByRole('button', { name: /Upload Document/i }))
    expect(screen.getByText(/Upload Document — coming next/i)).toBeInTheDocument()
  })

  it('Billing tab renders invoices for the current client', async () => {
    const user = userEvent.setup()
    renderProfilePage('c1') // c1 has multiple invoices in seed
    await user.click(screen.getByRole('tab', { name: /Billing/i }))
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
    expect(screen.getByText('INV-0002')).toBeInTheDocument()
  })
})
