# Invoice Paid Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an invoice is marked paid in `InvoiceDetailModal`, the session billing tab invoice list, activity section, and session wrap-up all reflect the change immediately.

**Architecture:** A `handleInvoicePaid(invoiceId, amount)` callback is defined in `SessionNotes` (where `updateSession` is in scope), passed as `onInvoicePaid` to `BillingTab`, which forwards it to `InvoiceDetailModal`. The modal calls it after `markPaid()` succeeds. The callback mutates `session.billing` in `SessionsContext` — flipping the invoice status, decrementing `outstanding`, and appending an activity entry. The wrap-up's `billingOk` flag is already derived from `outstanding === 0` so it updates automatically.

**Tech Stack:** React 19, Vitest, @testing-library/react, @testing-library/user-event

---

## File Map

| File | Change |
|---|---|
| `src/components/InvoiceDetailModal.jsx` | Accept `onInvoicePaid` prop; call it in `handleMarkPaid` after `markPaid()` |
| `src/components/InvoiceDetailModal.test.jsx` | Add test: `onInvoicePaid` is called with correct `(invoiceId, amount)` |
| `src/pages/SessionNotes.jsx` | Define `handleInvoicePaid`; pass to `BillingTab`; `BillingTab` forwards to modal |
| `src/pages/SessionNotes.test.jsx` | Add tests: invoice badge updates, activity appended, wrap-up flips |

---

## Task 1: Test — `InvoiceDetailModal` fires `onInvoicePaid` after payment

**Files:**
- Modify: `src/components/InvoiceDetailModal.test.jsx`

- [ ] **Step 1: Add the failing test**

Open `src/components/InvoiceDetailModal.test.jsx`. Add this test inside the existing `describe('<InvoiceDetailModal>')` block, after the last `it(...)`:

```js
it('calls onInvoicePaid with invoiceId and total amount after cash payment', async () => {
  const user = userEvent.setup()
  const onInvoicePaid = vi.fn()
  render(
    <AllProviders>
      <InvoiceDetailModal invoiceId="inv-003" onClose={vi.fn()} onInvoicePaid={onInvoicePaid} />
    </AllProviders>
  )
  await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
  await user.click(screen.getByRole('button', { name: 'Cash' }))
  await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
  // inv-003 is a sent invoice with one line item: 1 × ₹1,750
  expect(onInvoicePaid).toHaveBeenCalledOnce()
  expect(onInvoicePaid).toHaveBeenCalledWith('inv-003', 1750)
})
```

- [ ] **Step 2: Run the test — confirm it fails**

```
npm test -- InvoiceDetailModal --run
```

Expected: FAIL — `onInvoicePaid` is not called (prop doesn't exist yet).

---

## Task 2: Implement `onInvoicePaid` prop in `InvoiceDetailModal`

**Files:**
- Modify: `src/components/InvoiceDetailModal.jsx`

- [ ] **Step 1: Accept the new prop**

In `src/components/InvoiceDetailModal.jsx`, change the function signature at line 28 from:

```js
export default function InvoiceDetailModal({ invoiceId, onClose }) {
```

to:

```js
export default function InvoiceDetailModal({ invoiceId, onClose, onInvoicePaid = () => {} }) {
```

- [ ] **Step 2: Call the prop in `handleMarkPaid`**

`total` is already computed at line 52 (`const total = totalForInvoice(invoice)`). In `handleMarkPaid` (lines 56–65), add the `onInvoicePaid` call immediately after `markPaid()`:

```js
function handleMarkPaid() {
  const needsTxn = PAYMENT_METHODS.find(p => p.id === method)?.requiresTxn
  if (needsTxn && !txnId.trim()) {
    alert('Transaction ID is required for UPI / Card payments.')
    return
  }
  markPaid(invoice.id, { method, txnId: txnId.trim() })
  onInvoicePaid(invoice.id, total)
  setShowPay(false)
  setTxnId('')
}
```

- [ ] **Step 3: Run the test — confirm it passes**

```
npm test -- InvoiceDetailModal --run
```

Expected: ALL PASS.

- [ ] **Step 4: Commit**

```
git add src/components/InvoiceDetailModal.jsx src/components/InvoiceDetailModal.test.jsx
git commit -m "feat: fire onInvoicePaid callback after marking invoice paid"
```

---

## Task 3: Tests — session billing updates when invoice is marked paid

**Files:**
- Modify: `src/pages/SessionNotes.test.jsx`

The session `sess-1` has `inv-002` (draft, ₹1,750) with `outstanding: 1750`. Marking it paid should: flip the badge, append an activity entry, and set `outstanding` to 0 so the wrap-up flips.

- [ ] **Step 1: Add a helper to open the modal for inv-002**

Inside `describe('<SessionNotes> billing tab')`, add this helper below `openBillingTab`:

```js
async function payInvoice002() {
  const user = await openBillingTab()
  await user.click(screen.getByText('inv-002'))
  await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
  await user.click(screen.getByRole('button', { name: 'Cash' }))
  await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
  return user
}
```

- [ ] **Step 2: Add three failing tests**

Add these three `it` blocks inside the same `describe` block:

```js
it('invoice badge updates to paid after marking payment', async () => {
  await payInvoice002()
  // The inv-002 card should now show the paid badge
  const badges = screen.getAllByText('paid')
  expect(badges.length).toBe(2) // inv-001 was already paid; inv-002 now also paid
})

it('appends a payment activity entry after marking payment', async () => {
  await payInvoice002()
  expect(screen.getByText(/Payment ₹1,750 received for inv-002/)).toBeInTheDocument()
})

it('wrap-up billing item flips to Invoice added after full payment', async () => {
  await payInvoice002()
  expect(screen.getByText('Invoice added')).toBeInTheDocument()
  expect(screen.queryByText('Billing pending')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run the tests — confirm they fail**

```
npm test -- SessionNotes --run
```

Expected: the three new tests FAIL (callback not wired up yet); existing tests still PASS.

---

## Task 4: Implement `handleInvoicePaid` in `SessionNotes` and wire the props chain

**Files:**
- Modify: `src/pages/SessionNotes.jsx`

- [ ] **Step 1: Define `handleInvoicePaid` in the `SessionNotes` component**

In `src/pages/SessionNotes.jsx`, add this function inside the `SessionNotes` component body, after the `handleFinalize` function (after line 76, before the `const pseDone` line):

```js
function handleInvoicePaid(invoiceId, amount) {
  const now = new Date()
  const day = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timestamp = `${day}, ${fmtTime(now.getHours(), now.getMinutes())}`
  updateSession(id, {
    billing: {
      ...session.billing,
      outstanding: session.billing.outstanding - amount,
      invoices: session.billing.invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
      ),
      activity: [
        ...session.billing.activity,
        {
          id: `act-${Date.now()}`,
          timestamp,
          event: `Payment ₹${amount.toLocaleString('en-IN')} received for ${invoiceId}`,
        },
      ],
    },
  })
}
```

- [ ] **Step 2: Pass `onInvoicePaid` to `BillingTab`**

At line 147, change:

```js
<BillingTab session={session} />
```

to:

```js
<BillingTab session={session} onInvoicePaid={handleInvoicePaid} />
```

- [ ] **Step 3: Update `BillingTab` to accept and forward the prop**

At line 371, change the function signature:

```js
function BillingTab({ session }) {
```

to:

```js
function BillingTab({ session, onInvoicePaid }) {
```

Then at lines 423–428, change the `InvoiceDetailModal` render to pass `onInvoicePaid`:

```js
{selectedInvoiceId && (
  <InvoiceDetailModal
    invoiceId={selectedInvoiceId}
    onClose={() => setSelectedInvoiceId(null)}
    onInvoicePaid={onInvoicePaid}
  />
)}
```

- [ ] **Step 4: Run all tests — confirm everything passes**

```
npm test --run
```

Expected: ALL PASS including the three new SessionNotes tests.

- [ ] **Step 5: Commit**

```
git add src/pages/SessionNotes.jsx src/pages/SessionNotes.test.jsx
git commit -m "feat: sync session billing when invoice marked paid — invoice list, activity, wrap-up"
```
