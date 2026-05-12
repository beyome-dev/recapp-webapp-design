// src/test/test-utils.jsx
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ClientsProvider } from '../context/ClientsContext'
import { BillingProvider } from '../context/BillingContext'
import { SessionsProvider } from '../context/SessionsContext'

export function AllProviders({ children, route = '/' }) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ClientsProvider>
          <BillingProvider>
            <SessionsProvider>
              {children}
            </SessionsProvider>
          </BillingProvider>
        </ClientsProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(<AllProviders route={route}>{ui}</AllProviders>)
}

// Re-export everything from testing-library for convenience
export * from '@testing-library/react'
