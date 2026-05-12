// src/context/ClientsContext.test.jsx
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ClientsProvider, useClients } from './ClientsContext'

function renderClients() {
  const wrapper = ({ children }) => <ClientsProvider>{children}</ClientsProvider>
  return renderHook(() => useClients(), { wrapper })
}

describe('ClientsContext — seed', () => {
  it('seeds 10 clients with expected shape', () => {
    const { result } = renderClients()
    expect(result.current.clients).toHaveLength(10)
    const arjun = result.current.clients.find(c => c.id === 'c1')
    expect(arjun).toMatchObject({
      firstName: 'Arjun',
      lastName: 'Sharma',
      accountStatus: 'active',
      atRisk: false,
    })
    expect(arjun.demographics.address).toMatchObject({ city: 'Bengaluru' })
    expect(arjun.consents).toHaveLength(2)
    expect(arjun.consents.map(c => c.type).sort()).toEqual(['recording', 'treatment'])
  })

  it('mixes statuses and at-risk flags in seed data', () => {
    const { result } = renderClients()
    const statuses = new Set(result.current.clients.map(c => c.accountStatus))
    expect(statuses).toEqual(new Set(['active', 'inactive', 'discharged']))
    const atRiskCount = result.current.clients.filter(c => c.atRisk).length
    expect(atRiskCount).toBeGreaterThan(0)
  })
})

describe('ClientsContext — getClient', () => {
  it('returns the client by id', () => {
    const { result } = renderClients()
    expect(result.current.getClient('c2').firstName).toBe('Meera')
  })

  it('returns null for unknown id', () => {
    const { result } = renderClients()
    expect(result.current.getClient('does-not-exist')).toBeNull()
  })
})

describe('ClientsContext — addClient', () => {
  it('appends a new client and derives name + initials', () => {
    const { result } = renderClients()
    let created
    act(() => {
      created = result.current.addClient({ firstName: 'Tara', lastName: 'Joshi' })
    })
    expect(created.firstName).toBe('Tara')
    expect(created.lastName).toBe('Joshi')
    expect(created.name).toBe('Tara J.')
    expect(created.initials).toBe('TJ')
    expect(result.current.clients).toHaveLength(11)
    expect(result.current.getClient(created.id)).toBeTruthy()
  })

  it('defaults missing fields to empty values', () => {
    const { result } = renderClients()
    let created
    act(() => {
      created = result.current.addClient({ firstName: 'Solo' })
    })
    expect(created.lastName).toBe('')
    expect(created.email).toBe('')
    expect(created.phone).toBe('')
    expect(created.accountStatus).toBe('active')
    expect(created.atRisk).toBe(false)
    expect(created.consents).toHaveLength(2)
  })
})

describe('ClientsContext — updateClient', () => {
  it('patches fields and recomputes derived name on rename', () => {
    const { result } = renderClients()
    act(() => {
      result.current.updateClient('c3', { firstName: 'Rohit', lastName: 'Khan' })
    })
    const c = result.current.getClient('c3')
    expect(c.firstName).toBe('Rohit')
    expect(c.lastName).toBe('Khan')
    expect(c.name).toBe('Rohit K.')
    expect(c.initials).toBe('RK')
  })

  it('does not alter unrelated clients', () => {
    const { result } = renderClients()
    const before = result.current.getClient('c1')
    act(() => {
      result.current.updateClient('c2', { phone: '+91 98200 99999' })
    })
    expect(result.current.getClient('c1')).toEqual(before)
    expect(result.current.getClient('c2').phone).toBe('+91 98200 99999')
  })
})

describe('ClientsContext — deleteClient', () => {
  it('removes the client', () => {
    const { result } = renderClients()
    act(() => {
      result.current.deleteClient('c1')
    })
    expect(result.current.clients).toHaveLength(9)
    expect(result.current.getClient('c1')).toBeNull()
  })

  it('is a no-op for unknown ids', () => {
    const { result } = renderClients()
    act(() => {
      result.current.deleteClient('does-not-exist')
    })
    expect(result.current.clients).toHaveLength(10)
  })
})

describe('ClientsContext — setAtRisk', () => {
  it('flips the at-risk flag', () => {
    const { result } = renderClients()
    expect(result.current.getClient('c1').atRisk).toBe(false)
    act(() => {
      result.current.setAtRisk('c1', true)
    })
    expect(result.current.getClient('c1').atRisk).toBe(true)
    act(() => {
      result.current.setAtRisk('c1', false)
    })
    expect(result.current.getClient('c1').atRisk).toBe(false)
  })
})

describe('ClientsContext — updateAddress', () => {
  it('merges address fields without clobbering siblings', () => {
    const { result } = renderClients()
    act(() => {
      result.current.updateAddress('c1', { postalCode: '560100', city: 'Whitefield' })
    })
    const addr = result.current.getClient('c1').demographics.address
    expect(addr.postalCode).toBe('560100')
    expect(addr.city).toBe('Whitefield')
    // Untouched fields preserved
    expect(addr.state).toBe('Karnataka')
    expect(addr.country).toBe('India')
  })
})

describe('ClientsContext — updateEmergencyContact', () => {
  it('merges emergency contact fields', () => {
    const { result } = renderClients()
    act(() => {
      result.current.updateEmergencyContact('c2', { phone: '+91 99999 00000' })
    })
    const ec = result.current.getClient('c2').demographics.emergencyContact
    expect(ec.phone).toBe('+91 99999 00000')
    expect(ec.name).toBe('Rakesh Reddy') // unchanged
    expect(ec.relationship).toBe('Spouse') // unchanged
  })
})

describe('ClientsContext — updateConsentStatus', () => {
  it('marks a consent as sent and preserves other consents', () => {
    const { result } = renderClients()
    act(() => {
      result.current.updateConsentStatus('c3', 'treatment', { status: 'sent', sentDate: '2026-05-09' })
    })
    const consents = result.current.getClient('c3').consents
    const treatment = consents.find(c => c.type === 'treatment')
    const recording = consents.find(c => c.type === 'recording')
    expect(treatment.status).toBe('sent')
    expect(treatment.sentDate).toBe('2026-05-09')
    expect(recording.status).toBe('pending') // untouched
  })

  it('transitions a consent through sent → completed', () => {
    const { result } = renderClients()
    act(() => {
      result.current.updateConsentStatus('c3', 'recording', { status: 'sent', sentDate: '2026-05-08' })
    })
    act(() => {
      result.current.updateConsentStatus('c3', 'recording', { status: 'completed', completedDate: '2026-05-09' })
    })
    const consent = result.current.getClient('c3').consents.find(c => c.type === 'recording')
    expect(consent.status).toBe('completed')
    expect(consent.completedDate).toBe('2026-05-09')
    expect(consent.sentDate).toBe('2026-05-08') // preserved through merge
  })
})
