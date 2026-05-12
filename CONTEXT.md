# Recapp domain context

Glossary of terms used across the app. Captured during planning so they stay consistent in code and conversation.

## Roles

- **Admin** — clinic-level superuser. Manages users, roles, billing, services, clinics.
- **Therapist** — conducts sessions; sees own clients only (planned; not currently enforced in UI).
- **Staff** (also called **Ops**) — manages bookings, payments, schedules. Cannot read clinical notes or start sessions.

## Client

A patient under care. Has demographics, address, a single emergency contact, consent forms, an account status, and a list of sessions.

- **Account status** — `active` | `inactive` | `discharged`. Drives the Status pill on the Clients list. (Source: backend `accountStatus` field.)
- **At Risk** — UI flag on the profile header. Currently frontend-only dummy data (see `docs/contradictions.md` row 5).

## Session

A single scheduled or completed appointment between a client and a therapist. Lives in `SessionsContext`.

- **Booking** — a future session that has been scheduled. (Used in Calendar UX.)
- **Active Session** — an in-progress recording/note-taking session.

## Consent forms

Documents sent to a client for digital signature.

- **Therapy Consent** → backend `consents` entry of type `treatment`
- **AI Scribe Consent** → backend `consents` entry of type `recording`
- **Intake Forms** → not in backend yet; frontend-only stub.

## Service

A bookable thing (e.g. "Individual Therapy 50 min"). Each service has a duration and a price.

## Sidebar / user profile

- The **sidebar** holds the main top-level nav (Home, Calendar, Sessions, Clients, Billing).
- The **user profile dropdown** sits on the sidebar and holds account-level actions (Edit Profile, Settings, Help Centre, Log Out). Settings is **not** a sidebar item — it's reached via this dropdown only.
