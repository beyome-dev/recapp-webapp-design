# Invoice Paid Sync — Design Spec

**Date:** 2026-05-14  
**Status:** Approved

## Problem

When an invoice is marked paid in `InvoiceDetailModal`, only `BillingContext` (the global invoices store) is updated. The session-scoped billing data in `SessionsContext` is never touched, so three areas fail to reflect the change:

- **Invoice list** — card still shows the old status badge (e.g. `draft` or `sent`)
- **Activity section** — no payment event is appended
- **Session Wrap-Up** — "Billing pending" warning persists even after full payment

## Root Cause

`InvoiceDetailModal` calls `markPaid()` on `BillingContext`. `SessionNotes` and its children read from `session.billing` in `SessionsContext`. The two stores are not synchronised.

## Design

### Approach

Callback pattern (Approach B). A `handleInvoicePaid` callback is defined in `SessionNotes` where `updateSession` is already in scope. It is passed down the props chain to `InvoiceDetailModal`, which fires it after `markPaid()` succeeds.

### Callback signature

```js
handleInvoicePaid(invoiceId: string, amount: number): void
```

### What the callback does

Calls `updateSession(session.id, { billing: { ...patch } })` with three mutations applied to `session.billing`:

1. **Invoice status** — maps over `session.billing.invoices`, flips the matching invoice's `status` to `'paid'`
2. **Outstanding balance** — subtracts `amount` from `session.billing.outstanding`
3. **Activity entry** — appends a new entry to `session.billing.activity`:
   - `id`: `act-${Date.now()}`
   - `timestamp`: current date/time formatted as `"14 May 2026, 12:30 pm"` (matching existing seed format)
   - `event`: `"Payment ₹{amount} received for {invoiceId}"`

### Session Wrap-Up

No extra work needed. `billingOk` is already derived as `session.billing.outstanding === 0`. When the last outstanding invoice is paid and `outstanding` reaches `0`, the wrap-up automatically switches from the amber "Billing pending" warning to the green "Invoice added" checkmark.

### Props chain

```
SessionNotes        defines handleInvoicePaid, passes as onInvoicePaid to BillingTab
  └─ BillingTab     receives onInvoicePaid, passes it through to InvoiceDetailModal
       └─ InvoiceDetailModal   calls onInvoicePaid(invoice.id, amount) after markPaid()
```

### Files changed

| File | Change |
|------|--------|
| `recapp/src/pages/SessionNotes.jsx` | Define `handleInvoicePaid`; pass as `onInvoicePaid` prop to `BillingTab`; `BillingTab` forwards it to `InvoiceDetailModal` |
| `recapp/src/components/InvoiceDetailModal.jsx` | Accept `onInvoicePaid` prop; call it inside the existing payment handler after `markPaid()` |

No other files change.

## Behaviour Summary

| User action | Invoice list | Activity | Wrap-Up |
|---|---|---|---|
| Mark invoice paid (partial payment remains) | Badge → `paid` | New payment event appended | Still "Billing pending" |
| Mark last outstanding invoice paid | Badge → `paid` | New payment event appended | Flips to "Invoice added" (green) |
