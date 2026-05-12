// src/context/ClientsContext.jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// ── Mock seed ──────────────────────────────────────────────────────────────
// Preserves the original 6 ids (c1..c6) so existing session seed data still
// resolves; adds c7..c10 to give the Clients list real variety.

function seedClient({
  id, firstName, lastName, gender, pronouns, dateOfBirth,
  email, phone, address, occupation, maritalStatus, emergencyContact,
  consents, intakeForms = [], riskAssessment, atRisk = false,
  accountStatus = 'active', assignedTherapistIds = [], documents = [],
  registrationDate, lastSessionDate, totalSessions = 0,
  initials, colour,
}) {
  const fn = firstName || ''
  const ln = lastName || ''
  return {
    id,
    clientCode: id.toUpperCase(),
    firstName: fn,
    lastName:  ln,
    name:      ln ? `${fn} ${ln.charAt(0)}.` : fn,
    initials:  initials || (fn.charAt(0) + ln.charAt(0)).toUpperCase() || '?',
    colour:    colour || '#475569',
    email, phone, dateOfBirth, gender, pronouns,
    demographics: {
      address: address || { street: '', city: '', state: '', postalCode: '', country: 'India' },
      occupation: occupation || '',
      maritalStatus: maritalStatus || '',
      emergencyContact: emergencyContact || { name: '', relationship: '', phone: '' },
    },
    consents: consents || [
      { type: 'treatment', status: 'pending', sentDate: null, completedDate: null, documentUrl: null },
      { type: 'recording', status: 'pending', sentDate: null, completedDate: null, documentUrl: null },
    ],
    intakeForms,
    clinicalInfo: {
      riskAssessment: riskAssessment || {
        suicidalIdeation: false, selfHarm: false, substanceAbuse: false, notes: '',
      },
    },
    atRisk,
    accountStatus,
    assignedTherapistIds,
    documents,
    assessments: [],
    worksheets: [],
    registrationDate: registrationDate || '2025-09-15',
    lastSessionDate: lastSessionDate || null,
    totalSessions,
  }
}

const SEED_CLIENTS = [
  seedClient({
    id: 'c1', firstName: 'Arjun', lastName: 'Sharma',
    gender: 'Male', pronouns: 'he/him', dateOfBirth: '1992-03-12',
    email: 'arjun.s@example.com', phone: '+91 98200 11122',
    address: { street: '14 Brigade Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
    occupation: 'Software Engineer', maritalStatus: 'Single',
    emergencyContact: { name: 'Sneha Sharma', relationship: 'Sister', phone: '+91 98200 33344' },
    consents: [
      { type: 'treatment', status: 'completed', sentDate: '2025-10-01', completedDate: '2025-10-02', documentUrl: '#' },
      { type: 'recording', status: 'completed', sentDate: '2025-10-01', completedDate: '2025-10-02', documentUrl: '#' },
    ],
    accountStatus: 'active', lastSessionDate: '2026-05-07', totalSessions: 12,
    initials: 'AS', colour: '#2C5C40',
  }),
  seedClient({
    id: 'c2', firstName: 'Meera', lastName: 'Reddy',
    gender: 'Female', pronouns: 'she/her', dateOfBirth: '1988-11-28',
    email: 'meera.r@example.com', phone: '+91 98200 22233',
    address: { street: '88 Banjara Hills', city: 'Hyderabad', state: 'Telangana', postalCode: '500034', country: 'India' },
    occupation: 'Architect', maritalStatus: 'Married',
    emergencyContact: { name: 'Rakesh Reddy', relationship: 'Spouse', phone: '+91 98200 44455' },
    consents: [
      { type: 'treatment', status: 'completed', sentDate: '2025-09-20', completedDate: '2025-09-22', documentUrl: '#' },
      { type: 'recording', status: 'pending', sentDate: '2025-09-20', completedDate: null, documentUrl: null },
    ],
    accountStatus: 'active', lastSessionDate: '2026-05-06', totalSessions: 8,
    initials: 'MR', colour: '#1D4ED8',
  }),
  seedClient({
    id: 'c3', firstName: 'Rohan', lastName: 'Kumar',
    gender: 'Male', pronouns: 'he/him', dateOfBirth: '1995-06-04',
    email: 'rohan.k@example.com', phone: '+91 98200 55566',
    address: { street: '12 Park Street', city: 'Kolkata', state: 'West Bengal', postalCode: '700016', country: 'India' },
    occupation: 'Graduate Student', maritalStatus: 'Single',
    emergencyContact: { name: 'Pradeep Kumar', relationship: 'Father', phone: '+91 98200 77788' },
    accountStatus: 'active', lastSessionDate: null, totalSessions: 0,
    initials: 'RK', colour: '#B45309',
  }),
  seedClient({
    id: 'c4', firstName: 'Ananya', lastName: 'Patel',
    gender: 'Female', pronouns: 'she/her', dateOfBirth: '1991-01-19',
    email: 'ananya.p@example.com', phone: '+91 98200 99001',
    address: { street: '5 CG Road', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380009', country: 'India' },
    occupation: 'Marketing Manager', maritalStatus: 'Single',
    emergencyContact: { name: 'Kiran Patel', relationship: 'Mother', phone: '+91 98200 66677' },
    accountStatus: 'active', lastSessionDate: '2026-04-28', totalSessions: 5,
    initials: 'AP', colour: '#6D28D9',
  }),
  seedClient({
    id: 'c5', firstName: 'Kavya', lastName: 'Menon',
    gender: 'Female', pronouns: 'she/her', dateOfBirth: '1990-09-22',
    email: 'kavya.m@example.com', phone: '+91 98200 12121',
    address: { street: '23 MG Road', city: 'Kochi', state: 'Kerala', postalCode: '682016', country: 'India' },
    occupation: 'Doctor', maritalStatus: 'Married',
    emergencyContact: { name: 'Anil Menon', relationship: 'Spouse', phone: '+91 98200 13131' },
    accountStatus: 'active', lastSessionDate: '2026-04-15', totalSessions: 3,
    initials: 'KM', colour: '#0F766E',
  }),
  seedClient({
    id: 'c6', firstName: 'Suresh', lastName: 'Bose',
    gender: 'Male', pronouns: 'he/him', dateOfBirth: '1985-07-11',
    email: 'suresh.b@example.com', phone: '+91 98200 14141',
    address: { street: '67 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', postalCode: '500033', country: 'India' },
    occupation: 'Entrepreneur', maritalStatus: 'Married',
    emergencyContact: { name: 'Lakshmi Bose', relationship: 'Spouse', phone: '+91 98200 15151' },
    accountStatus: 'active', lastSessionDate: '2026-04-22', totalSessions: 6,
    initials: 'SB', colour: '#7C3AED',
  }),
  seedClient({
    id: 'c7', firstName: 'Devika', lastName: 'Iyer',
    gender: 'Female', pronouns: 'she/her', dateOfBirth: '1993-12-02',
    email: 'devika.i@example.com', phone: '+91 98200 16161',
    address: { street: '101 T Nagar', city: 'Chennai', state: 'Tamil Nadu', postalCode: '600017', country: 'India' },
    occupation: 'Teacher', maritalStatus: 'Single',
    emergencyContact: { name: 'Vinod Iyer', relationship: 'Father', phone: '+91 98200 17171' },
    accountStatus: 'inactive', lastSessionDate: '2025-12-10', totalSessions: 4,
    initials: 'DI', colour: '#DB2777',
  }),
  seedClient({
    id: 'c8', firstName: 'Karthik', lastName: 'Nair',
    gender: 'Male', pronouns: 'he/him', dateOfBirth: '1989-04-30',
    email: 'karthik.n@example.com', phone: '+91 98200 18181',
    address: { street: '34 Indiranagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560038', country: 'India' },
    occupation: 'Designer', maritalStatus: 'Single',
    emergencyContact: { name: 'Reena Nair', relationship: 'Sister', phone: '+91 98200 19191' },
    riskAssessment: { suicidalIdeation: false, selfHarm: false, substanceAbuse: true, notes: 'Disclosed alcohol dependence at intake.' },
    atRisk: true, accountStatus: 'active', lastSessionDate: '2026-05-03', totalSessions: 9,
    initials: 'KN', colour: '#DC2626',
  }),
  seedClient({
    id: 'c9', firstName: 'Priya', lastName: 'Gupta',
    gender: 'Female', pronouns: 'she/her', dateOfBirth: '1996-08-15',
    email: 'priya.g@example.com', phone: '+91 98200 20202',
    address: { street: '12 Connaught Place', city: 'New Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
    occupation: 'Journalist', maritalStatus: 'Single',
    emergencyContact: { name: 'Anita Gupta', relationship: 'Mother', phone: '+91 98200 21212' },
    accountStatus: 'active', lastSessionDate: '2026-05-01', totalSessions: 2,
    initials: 'PG', colour: '#0891B2',
  }),
  seedClient({
    id: 'c10', firstName: 'Sandeep', lastName: 'Verma',
    gender: 'Male', pronouns: 'he/him', dateOfBirth: '1980-02-25',
    email: 'sandeep.v@example.com', phone: '+91 98200 23232',
    address: { street: '7 Civil Lines', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India' },
    occupation: 'Lawyer', maritalStatus: 'Married',
    emergencyContact: { name: 'Neha Verma', relationship: 'Spouse', phone: '+91 98200 24242' },
    accountStatus: 'discharged', lastSessionDate: '2025-11-05', totalSessions: 18,
    initials: 'SV', colour: '#65A30D',
  }),
]

// ── Context ────────────────────────────────────────────────────────────────
const ClientsContext = createContext(null)

export function ClientsProvider({ children }) {
  const [clients, setClients] = useState(SEED_CLIENTS)

  const getClient = useCallback(
    (clientId) => clients.find(c => c.id === clientId) ?? null,
    [clients]
  )

  const addClient = useCallback(({ firstName, lastName, ...rest }) => {
    const id = 'c-' + Date.now()
    const trimmedFirst = (firstName || '').trim()
    const trimmedLast  = (lastName  || '').trim()
    const newClient = seedClient({
      id,
      firstName: trimmedFirst || 'New Client',
      lastName:  trimmedLast,
      gender: '', pronouns: '', dateOfBirth: '',
      email: '', phone: '',
      ...rest,
      registrationDate: new Date().toISOString().slice(0, 10),
    })
    setClients(prev => [...prev, newClient])
    return newClient
  }, [])

  const updateClient = useCallback((id, patch) => {
    setClients(prev => prev.map(c => {
      if (c.id !== id) return c
      const merged = { ...c, ...patch }
      if (patch.firstName || patch.lastName) {
        const fn = patch.firstName ?? c.firstName
        const ln = patch.lastName ?? c.lastName
        merged.name = `${fn} ${ln.charAt(0)}.`
        merged.initials = `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase()
      }
      return merged
    }))
  }, [])

  const deleteClient = useCallback((id) => {
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  const setAtRisk = useCallback((id, atRisk) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, atRisk } : c))
  }, [])

  const updateAddress = useCallback((id, addressPatch) => {
    setClients(prev => prev.map(c =>
      c.id === id
        ? { ...c, demographics: { ...c.demographics, address: { ...c.demographics.address, ...addressPatch } } }
        : c
    ))
  }, [])

  const updateEmergencyContact = useCallback((id, ecPatch) => {
    setClients(prev => prev.map(c =>
      c.id === id
        ? { ...c, demographics: { ...c.demographics, emergencyContact: { ...c.demographics.emergencyContact, ...ecPatch } } }
        : c
    ))
  }, [])

  const updateConsentStatus = useCallback((id, consentType, statusPatch) => {
    setClients(prev => prev.map(c => {
      if (c.id !== id) return c
      const consents = c.consents.map(k => k.type === consentType ? { ...k, ...statusPatch } : k)
      return { ...c, consents }
    }))
  }, [])

  const value = useMemo(() => ({
    clients, getClient,
    addClient, updateClient, deleteClient,
    setAtRisk, updateAddress, updateEmergencyContact, updateConsentStatus,
  }), [clients, getClient, addClient, updateClient, deleteClient, setAtRisk, updateAddress, updateEmergencyContact, updateConsentStatus])

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (ctx === null) throw new Error('useClients must be used inside ClientsProvider')
  return ctx
}
