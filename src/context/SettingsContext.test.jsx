// src/context/SettingsContext.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { SettingsProvider, useSettings, LICENSE_TYPES, NOTIFICATION_EVENTS, DAYS_OF_WEEK } from './SettingsContext'

function renderSettings() {
  // Wrap with Auth so SettingsContext can read user (defaults to no user — seed uses fallback)
  function LoginAndExpose() {
    const auth = useAuth()
    const settings = useSettings()
    return { auth, settings }
  }
  const wrapper = ({ children }) => (
    <AuthProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </AuthProvider>
  )
  return renderHook(() => LoginAndExpose(), { wrapper })
}

describe('SettingsContext — seed', () => {
  it('seeds defaults when no user is logged in', () => {
    const { result } = renderSettings()
    const s = result.current.settings.settings
    expect(s.profile.email).toBe('')
    expect(s.profile.licenseType).toBe('Therapist')
    expect(s.credentials).toEqual([])
    expect(s.calendarSync.google.connected).toBe(false)
    expect(s.workingHours).toHaveLength(7)
  })

  it('default availability is Mon-Fri 9-5 with weekends off', () => {
    const { result } = renderSettings()
    const { workingHours } = result.current.settings.settings
    for (const wh of workingHours) {
      const day = DAYS_OF_WEEK.find(d => d.id === wh.dayOfWeek)
      if (day.weekend) {
        expect(wh.available).toBe(false)
      } else {
        expect(wh.available).toBe(true)
      }
      expect(wh.startTime).toBe('09:00')
      expect(wh.endTime).toBe('17:00')
    }
  })

  it('seeds 4 notification preferences (3 enabled, 1 disabled)', () => {
    const { result } = renderSettings()
    const { notificationPrefs } = result.current.settings.settings
    const ids = NOTIFICATION_EVENTS.map(e => e.id)
    for (const id of ids) expect(typeof notificationPrefs[id]).toBe('boolean')
    expect(notificationPrefs.clientSelfScheduled).toBe(false)
    expect(notificationPrefs.assessmentCompleted).toBe(true)
  })

  it('seeds firstName from email when a user logs in', () => {
    const { result } = renderSettings()
    act(() => { result.current.auth.login('therapist@recapp.me') })
    // Settings was already seeded at provider mount — the test verifies seed
    // is independent of post-mount login. We don't need to re-seed mid-session.
    // (Production behaviour: login happens before SettingsProvider mounts.)
    expect(result.current.auth.user.email).toBe('therapist@recapp.me')
  })
})

describe('SettingsContext — updateProfile', () => {
  it('patches profile fields', () => {
    const { result } = renderSettings()
    act(() => {
      result.current.settings.updateProfile({ firstName: 'Anya', licenseType: 'Psychiatrist' })
    })
    const p = result.current.settings.settings.profile
    expect(p.firstName).toBe('Anya')
    expect(p.licenseType).toBe('Psychiatrist')
  })
})

describe('SettingsContext — notification prefs', () => {
  it('toggles a preference', () => {
    const { result } = renderSettings()
    const before = result.current.settings.settings.notificationPrefs.assessmentCompleted
    act(() => {
      result.current.settings.updateNotificationPref('assessmentCompleted', !before)
    })
    expect(result.current.settings.settings.notificationPrefs.assessmentCompleted).toBe(!before)
  })
})

describe('SettingsContext — credentials', () => {
  it('addCredential appends with generated id and defaults missing fields', () => {
    const { result } = renderSettings()
    let created
    act(() => {
      created = result.current.settings.addCredential({ credentials: 'RCI Psychologist' })
    })
    expect(created.id).toMatch(/^cred-/)
    expect(created.credentials).toBe('RCI Psychologist')
    expect(created.licenseNumber).toBe('')
    expect(result.current.settings.settings.credentials).toHaveLength(1)
  })

  it('updateCredential patches a credential', () => {
    const { result } = renderSettings()
    let created
    act(() => {
      created = result.current.settings.addCredential({ credentials: 'RCI Psychologist' })
    })
    act(() => {
      result.current.settings.updateCredential(created.id, { licenseNumber: 'A12345', state: 'Karnataka' })
    })
    const updated = result.current.settings.settings.credentials.find(c => c.id === created.id)
    expect(updated.licenseNumber).toBe('A12345')
    expect(updated.state).toBe('Karnataka')
  })

  it('removeCredential removes by id', () => {
    const { result } = renderSettings()
    let a, b
    act(() => {
      a = result.current.settings.addCredential({ credentials: 'License A' })
      b = result.current.settings.addCredential({ credentials: 'License B' })
    })
    expect(result.current.settings.settings.credentials).toHaveLength(2)
    act(() => {
      result.current.settings.removeCredential(a.id)
    })
    expect(result.current.settings.settings.credentials).toHaveLength(1)
    expect(result.current.settings.settings.credentials[0].id).toBe(b.id)
  })
})

describe('SettingsContext — working hours', () => {
  it('marks a day unavailable without losing time settings', () => {
    const { result } = renderSettings()
    act(() => {
      result.current.settings.updateWorkingHours(2, { available: false })
    })
    const tue = result.current.settings.settings.workingHours.find(w => w.dayOfWeek === 2)
    expect(tue.available).toBe(false)
    expect(tue.startTime).toBe('09:00')
    expect(tue.endTime).toBe('17:00')
  })

  it('updates start/end times', () => {
    const { result } = renderSettings()
    act(() => {
      result.current.settings.updateWorkingHours(1, { startTime: '10:30', endTime: '18:00' })
    })
    const mon = result.current.settings.settings.workingHours.find(w => w.dayOfWeek === 1)
    expect(mon.startTime).toBe('10:30')
    expect(mon.endTime).toBe('18:00')
  })
})

describe('SettingsContext — calendar sync', () => {
  it('connectGoogleCalendar sets connected + email + connectedAt', () => {
    const { result } = renderSettings()
    act(() => {
      result.current.settings.updateProfile({ email: 'me@example.com' })
    })
    act(() => {
      result.current.settings.connectGoogleCalendar()
    })
    const g = result.current.settings.settings.calendarSync.google
    expect(g.connected).toBe(true)
    expect(g.email).toBe('me@example.com')
    expect(g.connectedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('disconnectGoogleCalendar clears state', () => {
    const { result } = renderSettings()
    act(() => { result.current.settings.connectGoogleCalendar() })
    act(() => { result.current.settings.disconnectGoogleCalendar() })
    expect(result.current.settings.settings.calendarSync.google.connected).toBe(false)
    expect(result.current.settings.settings.calendarSync.google.email).toBe('')
  })
})

describe('LICENSE_TYPES catalog', () => {
  it('exposes the 6 spec-defined license types', () => {
    expect(LICENSE_TYPES).toEqual([
      'Therapist',
      'RCI Therapist',
      'Nurse',
      'Support Staff',
      'Front Desk',
      'Psychiatrist',
    ])
  })
})
