// src/pages/Clients.test.jsx
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ClientsProvider } from '../context/ClientsContext'
import { BillingProvider } from '../context/BillingContext'
import { SessionsProvider } from '../context/SessionsContext'
import Clients from './Clients'

function ProfileMock() {
  return <div data-testid="profile-mock">profile page</div>
}

function renderClientsPage(route = '/clients') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ClientsProvider>
          <BillingProvider>
            <SessionsProvider>
              <Routes>
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ProfileMock />} />
              </Routes>
            </SessionsProvider>
          </BillingProvider>
        </ClientsProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<Clients> page', () => {
  it('renders header with counts', () => {
    renderClientsPage()
    expect(screen.getByRole('heading', { name: 'Clients' })).toBeInTheDocument()
    // 10 seeded clients, mix of active/inactive/discharged
    expect(screen.getByText(/10 clients/)).toBeInTheDocument()
  })

  it('renders all seeded clients in the table', () => {
    renderClientsPage()
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
    expect(screen.getByText('Meera Reddy')).toBeInTheDocument()
    expect(screen.getByText('Sandeep Verma')).toBeInTheDocument()
  })

  it('shows At Risk badge for at-risk clients only', () => {
    renderClientsPage()
    // c8 Karthik Nair is the seeded at-risk client
    const karthikRow = screen.getByText('Karthik Nair').closest('.clients-row')
    expect(within(karthikRow).getByText(/At risk/i)).toBeInTheDocument()

    const arjunRow = screen.getByText('Arjun Sharma').closest('.clients-row')
    expect(within(arjunRow).queryByText(/At risk/i)).not.toBeInTheDocument()
  })

  it('shows status pills', () => {
    renderClientsPage()
    // Each status appears at least twice (filter tab + at least one row pill)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Discharged').length).toBeGreaterThan(1)
  })

  it('search narrows by name', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    const searchInput = screen.getByPlaceholderText(/Search by name/i)
    await user.type(searchInput, 'arjun')
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
    expect(screen.queryByText('Meera Reddy')).not.toBeInTheDocument()
  })

  it('search narrows by email', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    const searchInput = screen.getByPlaceholderText(/Search by name/i)
    await user.type(searchInput, 'meera.r@example.com')
    expect(screen.getByText('Meera Reddy')).toBeInTheDocument()
    expect(screen.queryByText('Arjun Sharma')).not.toBeInTheDocument()
  })

  it('status filter narrows to Inactive', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    await user.click(screen.getByRole('button', { name: 'Inactive' }))
    expect(screen.getByText('Devika Iyer')).toBeInTheDocument()
    expect(screen.queryByText('Arjun Sharma')).not.toBeInTheDocument()
  })

  it('status filter narrows to Discharged', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    await user.click(screen.getByRole('button', { name: 'Discharged' }))
    expect(screen.getByText('Sandeep Verma')).toBeInTheDocument()
    expect(screen.queryByText('Arjun Sharma')).not.toBeInTheDocument()
  })

  it('empty-state when search has no matches', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    const searchInput = screen.getByPlaceholderText(/Search by name/i)
    await user.type(searchInput, 'NonexistentClientNameQQQ')
    expect(screen.getByText(/No clients match your search/i)).toBeInTheDocument()
  })

  it('clicking a row navigates to the client profile', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    await user.click(screen.getByText('Arjun Sharma'))
    expect(screen.getByTestId('profile-mock')).toBeInTheDocument()
  })

  it('opens New Client modal when the button is clicked', async () => {
    const user = userEvent.setup()
    const { container } = renderClientsPage()
    await user.click(screen.getByRole('button', { name: /New Client/i }))
    expect(container.querySelector('.ncl-panel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Type to search/i)).toBeInTheDocument()
  })

  it('selecting an existing client from New Client modal navigates to their profile', async () => {
    const user = userEvent.setup()
    const { container } = renderClientsPage()
    await user.click(screen.getByRole('button', { name: /New Client/i }))
    const modal = container.querySelector('.ncl-panel')
    await user.click(within(modal).getByText('Meera R.'))
    expect(screen.getByTestId('profile-mock')).toBeInTheDocument()
  })

  it('adding a brand new client via the New Client modal navigates to the new profile', async () => {
    const user = userEvent.setup()
    renderClientsPage()
    await user.click(screen.getByRole('button', { name: /New Client/i }))
    const input = screen.getByPlaceholderText(/Type to search/i)
    await user.type(input, 'Brand New')
    await user.click(screen.getByText(/Add new client, Brand New/i))
    expect(screen.getByTestId('profile-mock')).toBeInTheDocument()
  })
})
