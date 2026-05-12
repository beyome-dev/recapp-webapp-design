# Recapp — React Prototype

Vite + React 19 SPA prototype for the Recapp EHR platform.

## Running locally

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

## Test accounts

| Email | Role |
|-------|------|
| `admin@recapp.me` | Admin |
| `therapist@recapp.me` | Therapist |
| `ops@recapp.me` | Staff |

Password is not validated.

## Screen Inventory

| Screen | Route | File | Notes |
|--------|-------|------|-------|
| Landing | `/` | `pages/Landing.jsx` | Marketing / entry page |
| Login | `/login` | `pages/Login.jsx` | Auth (hardcoded) |
| Signup | `/signup` | `pages/Signup.jsx` | Registration flow |
| Dashboard | `/dashboard` | `pages/Dashboard.jsx` | Home after login |
| Calendar | `/calendar` | `pages/Calendar.jsx` | Booking and schedule |
| Sessions List | `/sessions` | `pages/SessionsList.jsx` | Table of all sessions + New Session modal |
| Active Session | `/sessions/:id/active` | `pages/ActiveSession.jsx` | Live session canvas with timer, waveform, End Session |
| Session Notes | `/sessions/:id/notes` | `pages/SessionNotes.jsx` | Post-session: note, transcript, billing, wrap-up |

## Key components

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | `components/Sidebar.jsx` | Fixed left nav (220px) |
| NewSessionModal | `components/NewSessionModal.jsx` | 3-step modal: client search → session details → consent |
| PSEOverlay | `components/PSEOverlay.jsx` | Post-Session Evaluation modal (emotions, intervention, exit state) |
| TemplatePicker | `components/TemplatePicker.jsx` | Note template switcher popup (Enhanced Note / SOAP / DAP / BIRP) |

## Context

| Context | File | Purpose |
|---------|------|---------|
| AuthContext | `context/AuthContext.jsx` | Hardcoded auth with role |
| SessionsContext | `context/SessionsContext.jsx` | In-memory session state (seed data included) |
