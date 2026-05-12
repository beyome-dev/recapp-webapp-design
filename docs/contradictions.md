# Spec ↔ Backend reconciliation

This document captures places where the **product spec** (Spec sheet.docx) and the **existing backend schema** (`recapp-backend/database-schema.md`) disagree, and the choice we made for the frontend prototype.

The backend will not be changed for this build. Where the spec asks for something the backend doesn't support, the frontend uses dummy data and the gap is flagged here for the product manager and backend team to resolve later.

Use this doc to:

- Decide which gaps need a backend ticket before the prototype goes to production.
- Track product decisions that diverge from current backend reality.

---

## Summary table

| # | Spec asks for | Backend has | Decision in prototype | Action needed |
|---|---|---|---|---|
| 1 | Pronouns field on the client profile | A single `gender` field (no `pronouns`) | Use the existing `gender` field. UI labels it as **"Pronouns / Gender"** — same data, dual-purpose label. | Product to decide if pronouns and gender should be modelled separately. If yes, backend will need a new `pronouns` field. |
| 2 | Multiple emergency contacts ("Emergency Contact**s**" section, add/manage) | A single `emergencyContact` object (one only) | Show a single Emergency Contact section in the UI (matches backend). | If clinicians need to capture more than one EC, backend needs to change `emergencyContact` to an array. |
| 3 | Address field labelled "Pincode" | `postalCode: String` | Read/write the same `postalCode` field. UI label says **"Pincode"** — purely cosmetic. | None. (Just a label preference for India-first product.) |
| 4 | Three consent forms: Therapy Consent, **AI Scribe Consent**, **Intake Forms** | Two consent types: `treatment` and `recording`. No `intake_form` type. | Two real consents (Therapy Consent → `treatment`, AI Scribe Consent → `recording`). Intake Forms is rendered as a separate section, **dummy data only**, no backend mapping yet. | Product to confirm if Intake Forms should live in the `consents` collection or get its own collection. Backend ticket needed either way. |
| 5 | Top-level "At Risk" toggle on the client profile header | Risk lives inside `clinicalInfo.riskAssessment` as three separate booleans (`suicidalIdeation`, `selfHarm`, `substanceAbuse`) | Profile shows a simple **At Risk** toggle backed by **frontend-only dummy data**. Not persisted to the backend yet. | Product to decide whether the toggle is a manual override on top of the clinical risk fields, or a derived flag. Backend may need to add an explicit `atRisk` boolean if the toggle is meant to be a clinician override. |
| 6 | Invoices are first-class entities — Billing page lists invoices, Add Invoice flow creates them, payments mark them paid/refunded | No dedicated `invoices` collection. Payments live on `bookings.payment` (per-booking) and `credits_ledger` (transactions). Refunds live on `bookings.payment.refundAmount` and `subscriptions.cancellation`. | Prototype models invoices in a frontend-only `BillingContext` with mock data (statuses: `draft` / `sent` / `paid` / `cancelled`; multi-service line items; payment-method capture). No backend persistence. | Product to decide if invoices should become a real backend collection, or if the UI should be reshaped to read directly from `bookings.payment` + `credits_ledger`. The latter requires reconciling multi-service invoices (spec) against the one-payment-per-booking shape (backend). |
| 7 | **License Type** field on user profile with 6 options (Therapist / RCI Therapist / Nurse / Support Staff / Front Desk / Psychiatrist) | Backend `users.role` has only 4 values (`admin` / `therapist` / `ops` / `manager`) — these are permission roles, not professional categories. | Settings → My Account → Profile shows a "License Type" dropdown backed by a **frontend-only** `licenseType` field on user settings. | Product to decide whether License Type is a separate concept (professional category) from `role` (permission level), or whether the existing `role` enum should be expanded. If kept separate, backend needs a new `users.licenseType` field. |
| 8 | Per-event **notification preferences** (4 checkboxes: client completes assessment / client is transferred / client finishes intake / client self-schedules appointment) | Not modelled in backend. | Settings → My Account → Notifications stores 4 frontend-only booleans. | Backend needs a new `users.notificationPreferences` (or similar) shape. Product to confirm the full set of preference events. |
| 9 | **Calendar Sync** with Google Calendar (connect / disconnect) | Not modelled in backend. No OAuth flow either. | Settings → Scheduling → Calendar Sync shows a Google Calendar toggle with a mock connected state (frontend-only boolean). Real OAuth integration is out of scope. | Backend needs `users.integrations.googleCalendar` (or similar) plus a real OAuth handshake. |
| 10 | **State** field on Clinical Credentials | Backend has `profile.credentials[].issuedBy` (free-text — could hold a state, an agency name, or a country). | Frontend stores a dedicated `state` field on each credential entry, separate from `issuedBy`. Prototype writes both at the same field for now (`issuedBy`-as-state). | Decide whether to split into `state` + `issuingAuthority`, or keep one free-text field and rename. |

---

## What this means for the prototype

- **Anything that exists in both places** (firstName, lastName, email, phone, dateOfBirth, address fields, accountStatus, lastSessionDate, etc.) is wired through the agreed field names so the prototype's mock data shape can be swapped for real API data with minimal change.
- **Anything that exists only in the spec** (multiple ECs, Intake Forms, At Risk toggle, pronouns-as-distinct-from-gender) is rendered with dummy data so the screens match the spec design, but doesn't pretend to persist anywhere real.
- **Nothing in the backend was changed** for this build.

---

## Open questions for product

1. **Pronouns vs gender** — are these the same field, or two? (This drives whether the backend needs a new field.)
2. **Multiple emergency contacts** — is one enough, or do clinicians genuinely need to capture more? (Touches backend schema.)
3. **Intake Forms placement** — same collection as consents, or separate? Same `sent → completed` lifecycle?
4. **At Risk toggle** — is this a clinician override, or a system-derived flag based on the existing risk-assessment fields?

Resolving these unblocks the next backend iteration.
