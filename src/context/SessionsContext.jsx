// src/context/SessionsContext.jsx
import { createContext, useContext, useState } from 'react'

const SEED_SESSIONS = [
  {
    id: 'sess-1',
    clientId: 'c1',
    type: 'online',
    service: 'Individual Therapy',
    duration: 50,
    date: '2026-05-07',
    startH: 11,
    startM: 24,
    status: 'completed',
    mode: 'ai-scribe',
    consentGiven: true,
    recordingActive: false,
    elapsedSeconds: 3000,
    noteTitle: 'Session with Arjun S.',
    noteContent: 'Client arrived on time, appeared visibly tense. Mentioned ongoing conflict at work — manager feedback last week triggered significant anxiety. Discussed avoidance behaviours: has not responded to emails in three days. Explored the fear underneath — feeling evaluated and found lacking. Used cognitive restructuring to identify distorted thinking patterns. Client responded well to reframing exercise. Agreed to send one email before next session as a behavioural experiment.',
    noteEnhanced: true,
    noteLocked: false,
    rawNoteContent: 'arrived tense. work conflict again — manager feedback. avoiding emails 3 days. fear of being judged. reframing — "I am incompetent" → "I made a mistake, I can fix it". agreed to send one email before next session.',
    therapistId: null,
    room: null,
    meetLink: null,
    pse: {
      completed: true,
      skipped: false,
      emotions: ['Anxious', 'Overwhelmed', 'Avoidant'],
      intervention: 'CBT',
      exitState: 'Slightly calmer, but still processing',
    },
    billing: {
      total: 3500,
      outstanding: 1750,
      invoices: [
        { id: 'inv-001', status: 'paid',  service: 'Individual Therapy (50 min)', date: '07 May 2026', amount: 1750 },
        { id: 'inv-002', status: 'draft', service: 'Individual Therapy (50 min)', date: '07 May 2026', amount: 1750 },
      ],
      activity: [
        { id: 'act-1', timestamp: '07 May 2026, 12:18 pm', event: 'Invoice inv-001 created' },
        { id: 'act-2', timestamp: '07 May 2026, 12:20 pm', event: 'Payment ₹1,750 received for inv-001' },
        { id: 'act-3', timestamp: '07 May 2026, 12:21 pm', event: 'Invoice inv-002 created (draft)' },
      ],
    },
  },
  {
    id: 'sess-2',
    clientId: 'c2',
    type: 'in-person',
    service: 'Couples Therapy',
    duration: 80,
    date: '2026-05-06',
    startH: 14,
    startM: 0,
    status: 'completed',
    mode: 'handwritten',
    consentGiven: false,
    recordingActive: false,
    elapsedSeconds: 4800,
    noteTitle: 'Session with Meera R.',
    noteContent: 'Partners discussed communication patterns around household responsibilities. Meera expressed feeling unheard during disagreements. Used active listening exercise — both partners reflected back before responding. Identified trigger: Meera feels dismissed when interrupted. Agreed on a speaking token exercise for home.',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: 'comm breakdown around chores. Meera feels unheard. active listening exercise — reflecting back. trigger = being interrupted. speaking token homework.',
    therapistId: null,
    room: null,
    meetLink: null,
    pse: {
      completed: false,
      skipped: true,
      emotions: [],
      intervention: '',
      exitState: '',
    },
    billing: {
      total: 5000,
      outstanding: 5000,
      invoices: [],
      activity: [],
    },
  },
  {
    id: 'sess-3',
    clientId: 'c3',
    type: 'phone',
    service: 'Individual Therapy',
    duration: 50,
    date: '2026-05-08',
    startH: 9,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: null,
    room: null,
    meetLink: null,
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
  {
    id: 'cal-s1',
    clientId: 'c1',
    type: 'online',
    service: 'Individual Therapy',
    duration: 60,
    date: '2026-05-04',
    startH: 10,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: 'dr-priya',
    room: null,
    meetLink: 'https://meet.google.com/abc-defg-hij',
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
  {
    id: 'cal-s2',
    clientId: 'c2',
    type: 'in-person',
    service: 'Couples Therapy',
    duration: 60,
    date: '2026-05-04',
    startH: 14,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: 'dr-priya',
    room: 'Room 1',
    meetLink: null,
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
  {
    id: 'cal-s3',
    clientId: 'c3',
    type: 'phone',
    service: 'Assessment',
    duration: 50,
    date: '2026-05-05',
    startH: 9,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: 'dr-priya',
    room: null,
    meetLink: null,
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
  {
    id: 'cal-s4',
    clientId: 'c4',
    type: 'in-person',
    service: 'Individual Therapy',
    duration: 60,
    date: '2026-05-06',
    startH: 11,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: 'dr-priya',
    room: 'Room 2',
    meetLink: null,
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
  {
    id: 'cal-a1',
    clientId: 'c5',
    type: 'online',
    service: 'Individual Therapy',
    duration: 60,
    date: '2026-05-04',
    startH: 10,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: 'dr-vikram',
    room: null,
    meetLink: 'https://meet.google.com/xyz-uvwx-yz1',
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
  {
    id: 'cal-a2',
    clientId: 'c6',
    type: 'in-person',
    service: 'Individual Therapy',
    duration: 60,
    date: '2026-05-05',
    startH: 13,
    startM: 0,
    status: 'upcoming',
    mode: null,
    consentGiven: null,
    recordingActive: false,
    elapsedSeconds: 0,
    noteTitle: '',
    noteContent: '',
    noteEnhanced: false,
    noteLocked: false,
    rawNoteContent: '',
    therapistId: 'dr-vikram',
    room: 'Room 1',
    meetLink: null,
    pse: { completed: false, skipped: false, emotions: [], intervention: '', exitState: '' },
    billing: { total: 0, outstanding: 0, invoices: [], activity: [] },
  },
]

const SessionsContext = createContext(null)

export function SessionsProvider({ children }) {
  const [sessions, setSessions] = useState(SEED_SESSIONS)

  function getSessionNumber(clientId, sessionId) {
    const clientSessions = sessions
      .filter(s => s.clientId === clientId)
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.startH - b.startH || a.startM - b.startM)
    const idx = clientSessions.findIndex(s => s.id === sessionId)
    return idx + 1
  }

  function addSession(sessionData) {
    const newId = 'sess-' + Date.now()
    setSessions(prev => [...prev, { id: newId, ...sessionData }])
    return newId
  }

  function updateSession(id, patch) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function deleteSession(id) {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  function updatePSE(id, psePatch) {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, pse: { ...s.pse, ...psePatch } } : s
    ))
  }

  return (
    <SessionsContext.Provider value={{
      sessions,
      getSessionNumber,
      addSession,
      updateSession,
      deleteSession,
      updatePSE,
    }}>
      {children}
    </SessionsContext.Provider>
  )
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions must be used inside SessionsProvider')
  return ctx
}
