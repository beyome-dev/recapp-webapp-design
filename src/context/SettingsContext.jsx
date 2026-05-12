// src/context/SettingsContext.jsx
//
// Frontend-only settings store. Mirrors backend `users.profile` shape where
// possible; adds frontend-only fields (licenseType, notificationPrefs,
// calendarSync) that the backend doesn't model. See docs/contradictions.md
// rows 7-10.

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

export const LICENSE_TYPES = [
  'Therapist',
  'RCI Therapist',
  'Nurse',
  'Support Staff',
  'Front Desk',
  'Psychiatrist',
]

export const NOTIFICATION_EVENTS = [
  { id: 'assessmentCompleted',  label: 'Client completes an assessment' },
  { id: 'clientTransferred',    label: 'Client is transferred to you' },
  { id: 'intakeCompleted',      label: 'Client finishes the intake form' },
  { id: 'clientSelfScheduled',  label: 'Client self-schedules an appointment' },
]

export const DAYS_OF_WEEK = [
  { id: 0, short: 'Sun', label: 'Sunday',    weekend: true  },
  { id: 1, short: 'Mon', label: 'Monday',    weekend: false },
  { id: 2, short: 'Tue', label: 'Tuesday',   weekend: false },
  { id: 3, short: 'Wed', label: 'Wednesday', weekend: false },
  { id: 4, short: 'Thu', label: 'Thursday',  weekend: false },
  { id: 5, short: 'Fri', label: 'Friday',    weekend: false },
  { id: 6, short: 'Sat', label: 'Saturday',  weekend: true  },
]

function defaultWorkingHours() {
  // Mon-Fri 9-5 by default; Sun/Sat unavailable
  return DAYS_OF_WEEK.map(d => ({
    dayOfWeek: d.id,
    available: !d.weekend,
    startTime: '09:00',
    endTime:   '17:00',
  }))
}

function seedSettingsFor(user) {
  const [first, last] = (user?.email?.split('@')[0] || '').split('.')
  const firstName = (first || 'New').replace(/^./, c => c.toUpperCase())
  const lastName  = (last  || '').replace(/^./, c => c.toUpperCase())
  return {
    profile: {
      photo: null,
      firstName,
      lastName,
      email: user?.email || '',
      phone: '',
      licenseType: 'Therapist',
    },
    notificationPrefs: {
      assessmentCompleted:  true,
      clientTransferred:    true,
      intakeCompleted:      true,
      clientSelfScheduled:  false,
    },
    credentials: [],
    workingHours: defaultWorkingHours(),
    calendarSync: {
      google: { connected: false, email: '', connectedAt: null },
    },
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(() => seedSettingsFor(user))

  const updateProfile = useCallback((patch) => {
    setSettings(s => ({ ...s, profile: { ...s.profile, ...patch } }))
  }, [])

  const updateNotificationPref = useCallback((id, value) => {
    setSettings(s => ({
      ...s,
      notificationPrefs: { ...s.notificationPrefs, [id]: value },
    }))
  }, [])

  const addCredential = useCallback((cred) => {
    const id = 'cred-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const entry = {
      id,
      credentials:   cred.credentials   || '',
      licenseNumber: cred.licenseNumber || '',
      state:         cred.state         || '',
      expirationDate: cred.expirationDate || '',
    }
    setSettings(s => ({ ...s, credentials: [...s.credentials, entry] }))
    return entry
  }, [])

  const updateCredential = useCallback((id, patch) => {
    setSettings(s => ({
      ...s,
      credentials: s.credentials.map(c => c.id === id ? { ...c, ...patch } : c),
    }))
  }, [])

  const removeCredential = useCallback((id) => {
    setSettings(s => ({
      ...s,
      credentials: s.credentials.filter(c => c.id !== id),
    }))
  }, [])

  const updateWorkingHours = useCallback((dayOfWeek, patch) => {
    setSettings(s => ({
      ...s,
      workingHours: s.workingHours.map(d =>
        d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d
      ),
    }))
  }, [])

  const connectGoogleCalendar = useCallback(() => {
    setSettings(s => ({
      ...s,
      calendarSync: {
        ...s.calendarSync,
        google: {
          connected: true,
          email: s.profile.email || '—',
          connectedAt: new Date().toISOString().slice(0, 10),
        },
      },
    }))
  }, [])

  const disconnectGoogleCalendar = useCallback(() => {
    setSettings(s => ({
      ...s,
      calendarSync: {
        ...s.calendarSync,
        google: { connected: false, email: '', connectedAt: null },
      },
    }))
  }, [])

  const value = useMemo(() => ({
    settings,
    updateProfile,
    updateNotificationPref,
    addCredential,
    updateCredential,
    removeCredential,
    updateWorkingHours,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  }), [settings, updateProfile, updateNotificationPref, addCredential, updateCredential, removeCredential, updateWorkingHours, connectGoogleCalendar, disconnectGoogleCalendar])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (ctx === null) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
