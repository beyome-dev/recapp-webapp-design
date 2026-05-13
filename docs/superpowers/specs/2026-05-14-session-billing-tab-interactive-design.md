# Session Billing Tab — Interactive Invoices

**Date:** 2026-05-14  
**Status:** Approved

## Problem

The billing tab on the completed session page (`SessionNotes.jsx`) is display-only. Users can see invoices listed but cannot open, act on, or create them. The standalone billing page (`Billing.jsx`) has full invoice management via `InvoiceDetailModal` and `AddInvoiceModal`, but those capabilities are not surfaced in the session context.

## Goal

Make the session billing tab functionally equivalent to the billing page for invoice actions:
- Click an invoice row to open `InvoiceDetailModal` (mark paid, send to client, cancel)
- Add a button to create a new invoice via `AddInvoiceModal`, pre-populated with the session's client

## Approach

Add state and modal rendering directly inside `BillingTab` in `SessionNotes.jsx`. No new files. No changes to `InvoiceDetailModal` or `AddInvoiceModal`.

## Changes

### `src/pages/SessionNotes.jsx`

**New imports:**
```js
import InvoiceDetailModal from '../components/InvoiceDetailModal'
import AddInvoiceModal from '../components/AddInvoiceModal'
```

**New state in `BillingTab`:**
```js
const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
const [showAddInvoice, setShowAddInvoice] = useState(false)
```

**Invoice rows — clickable:**  
Each `bl-invoice-card` div gets `onClick={() => setSelectedInvoiceId(inv.id)}` and a pointer cursor. The invoice IDs in `session.billing.invoices` (e.g. `INV-001`) map directly to IDs in `BillingContext`, so `InvoiceDetailModal` resolves them without additional data passing.

**InvoiceDetailModal mount:**
```jsx
{selectedInvoiceId && (
  <InvoiceDetailModal
    invoiceId={selectedInvoiceId}
    onClose={() => setSelectedInvoiceId(null)}
  />
)}
```

**Add Invoice button:**  
Placed in the billing tab header, alongside the total/outstanding summary. Opens `AddInvoiceModal` with `preselectedClientId={session.clientId}`, which skips step 1 (client selection) and goes straight to invoice details.

```jsx
<button onClick={() => setShowAddInvoice(true)}>+ Add Invoice</button>

{showAddInvoice && (
  <AddInvoiceModal
    preselectedClientId={session.clientId}
    onClose={() => setShowAddInvoice(false)}
  />
)}
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/SessionNotes.jsx` | Add imports, state, clickable rows, Add Invoice button, modal renders |

## Files Not Changed

| File | Reason |
|------|--------|
| `src/components/InvoiceDetailModal.jsx` | Already accepts `invoiceId` and `onClose` — no changes needed |
| `src/components/AddInvoiceModal.jsx` | Already accepts `preselectedClientId` — no changes needed |
| `src/pages/Billing.jsx` | Unrelated |
