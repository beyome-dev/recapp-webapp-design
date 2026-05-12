// src/pages/Settings.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ClientsProvider } from '../context/ClientsContext'
import { BillingProvider } from '../context/BillingContext'
import { SessionsProvider } from '../context/SessionsContext'
import { SettingsProvider, useSettings } from '../context/SettingsContext'
import Settings from './Settings'

function renderSettings(route = '/settings') {
  const settingsRef = { current: null }
  function Spy() { settingsRef.current = useSettings(); return null }
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <SettingsProvider>
          <ClientsProvider>
            <BillingProvider>
              <SessionsProvider>
                <Spy />
                <Routes>
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/:section" element={<Settings />} />
                  <Route path="/settings/:section/:sub" element={<Settings />} />
                </Routes>
              </SessionsProvider>
            </BillingProvider>
          </ClientsProvider>
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  )
  return { ...utils, settingsRef }
}

describe('<Settings> page — navigation', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('defaults to My Account → Profile', () => {
    renderSettings('/settings')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    // Profile heading is visible
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/i)).toBeInTheDocument()
  })

  it('renders all four sections in the rail', () => {
    renderSettings('/settings')
    expect(screen.getByRole('button', { name: /My Account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Scheduling/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Billing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Organisations/i })).toBeInTheDocument()
  })

  it('switches to Notifications sub-tab', async () => {
    const user = userEvent.setup()
    renderSettings('/settings')
    await user.click(screen.getByRole('tab', { name: /Notifications/i }))
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText(/Client completes an assessment/i)).toBeInTheDocument()
  })

  it('switches to Scheduling section and shows Availability by default', async () => {
    const user = userEvent.setup()
    renderSettings('/settings')
    await user.click(screen.getByRole('button', { name: /Scheduling/i }))
    expect(screen.getByRole('heading', { name: 'Availability' })).toBeInTheDocument()
  })

  it('deep-links via URL /settings/scheduling/calendar-sync', () => {
    renderSettings('/settings/scheduling/calendar-sync')
    expect(screen.getByRole('heading', { name: 'Calendar Sync' })).toBeInTheDocument()
    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
  })

  it('Billing settings shows the stub', async () => {
    const user = userEvent.setup()
    renderSettings('/settings')
    await user.click(screen.getByRole('button', { name: /Billing/i }))
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByText(/Coming next/i)).toBeInTheDocument()
  })

  it('Organisations shows the stub', async () => {
    const user = userEvent.setup()
    renderSettings('/settings')
    await user.click(screen.getByRole('button', { name: /Organisations/i }))
    expect(screen.getByRole('heading', { name: 'Organisations' })).toBeInTheDocument()
  })
})

describe('<Settings> — Profile', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('saves profile changes via the Save button', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/profile')
    const firstNameInput = screen.getByLabelText(/First name/i)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Asha')

    const phoneInput = screen.getByLabelText(/Phone number/i)
    await user.type(phoneInput, '+91 99000 12345')

    await user.click(screen.getByRole('button', { name: /Save changes/i }))

    expect(settingsRef.current.settings.profile.firstName).toBe('Asha')
    expect(settingsRef.current.settings.profile.phone).toBe('+91 99000 12345')
  })

  it('alerts when first name is cleared on save', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/profile')
    await user.clear(screen.getByLabelText(/First name/i))
    await user.click(screen.getByRole('button', { name: /Save changes/i }))
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/First name is required/i))
  })

  it('updates License Type via the select', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/profile')
    await user.selectOptions(screen.getByLabelText(/License type/i), 'Psychiatrist')
    await user.click(screen.getByRole('button', { name: /Save changes/i }))
    expect(settingsRef.current.settings.profile.licenseType).toBe('Psychiatrist')
  })
})

describe('<Settings> — Notifications', () => {
  it('toggling a checkbox persists', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/notifications')
    const before = settingsRef.current.settings.notificationPrefs.clientSelfScheduled
    expect(before).toBe(false)
    const checkbox = screen.getByLabelText(/Client self-schedules an appointment/i)
    await user.click(checkbox)
    expect(settingsRef.current.settings.notificationPrefs.clientSelfScheduled).toBe(true)
  })

  it('renders 4 notification rows', () => {
    renderSettings('/settings/my-account/notifications')
    expect(screen.getByLabelText(/Client completes an assessment/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Client is transferred to you/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Client finishes the intake form/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Client self-schedules an appointment/i)).toBeInTheDocument()
  })
})

describe('<Settings> — Clinical Credentials', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('adds a new credential', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/credentials')

    // Find inputs by label (uses set-add-cred section)
    const addCredSection = screen.getByRole('heading', { name: /Add credential/i }).closest('.set-add-cred')
    await user.type(within(addCredSection).getByLabelText(/Credentials/i), 'RCI Psychologist')
    await user.type(within(addCredSection).getByLabelText(/License number/i), 'A12345')
    await user.type(within(addCredSection).getByLabelText('State'), 'Karnataka')
    await user.click(within(addCredSection).getByRole('button', { name: /Add credential/i }))

    expect(settingsRef.current.settings.credentials).toHaveLength(1)
    expect(settingsRef.current.settings.credentials[0]).toMatchObject({
      credentials: 'RCI Psychologist',
      licenseNumber: 'A12345',
      state: 'Karnataka',
    })
  })

  it('rejects empty credentials with alert', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/credentials')
    const addCredSection = screen.getByRole('heading', { name: /Add credential/i }).closest('.set-add-cred')
    await user.click(within(addCredSection).getByRole('button', { name: /Add credential/i }))
    expect(window.alert).toHaveBeenCalled()
    expect(settingsRef.current.settings.credentials).toHaveLength(0)
  })

  it('removes a credential', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/my-account/credentials')
    // Seed one credential directly
    let created
    await import('react').then(({ act }) => act(() => {
      created = settingsRef.current.addCredential({ credentials: 'License A' })
    }))
    // Find the rendered row and click remove
    const row = screen.getByText('License A').closest('.set-cred-row')
    await user.click(within(row).getByLabelText('Remove credential'))
    expect(settingsRef.current.settings.credentials).toHaveLength(0)
  })
})

describe('<Settings> — Availability', () => {
  it('renders 7 weekday rows; Mon-Fri available, weekends off', () => {
    renderSettings('/settings/scheduling/availability')
    // The Monday checkbox should be checked
    expect(screen.getByLabelText(/Monday available/i)).toBeChecked()
    expect(screen.getByLabelText(/Friday available/i)).toBeChecked()
    expect(screen.getByLabelText(/Saturday available/i)).not.toBeChecked()
    expect(screen.getByLabelText(/Sunday available/i)).not.toBeChecked()
  })

  it('toggling availability persists; time fields disable when off', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/scheduling/availability')

    const mondayCheckbox = screen.getByLabelText(/Monday available/i)
    await user.click(mondayCheckbox)
    expect(mondayCheckbox).not.toBeChecked()
    const mon = settingsRef.current.settings.workingHours.find(w => w.dayOfWeek === 1)
    expect(mon.available).toBe(false)

    // Start-time input for Monday becomes disabled
    const monStart = screen.getByLabelText(/Monday start time/i)
    expect(monStart).toBeDisabled()
  })

  it('editing times persists', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/scheduling/availability')
    const tueStart = screen.getByLabelText(/Tuesday start time/i)
    await user.clear(tueStart)
    await user.type(tueStart, '10:30')
    const tue = settingsRef.current.settings.workingHours.find(w => w.dayOfWeek === 2)
    expect(tue.startTime).toBe('10:30')
  })
})

describe('<Settings> — Calendar Sync', () => {
  it('shows "Not connected" by default and Connect button', () => {
    renderSettings('/settings/scheduling/calendar-sync')
    expect(screen.getByText(/Not connected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Connect Google Calendar/i })).toBeInTheDocument()
  })

  it('Connect → Disconnect cycle works', async () => {
    const user = userEvent.setup()
    const { settingsRef } = renderSettings('/settings/scheduling/calendar-sync')
    await user.click(screen.getByRole('button', { name: /Connect Google Calendar/i }))
    expect(settingsRef.current.settings.calendarSync.google.connected).toBe(true)
    expect(screen.getByText(/Connected as/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Disconnect/i }))
    expect(settingsRef.current.settings.calendarSync.google.connected).toBe(false)
    expect(screen.getByText(/Not connected/i)).toBeInTheDocument()
  })
})
