# Session Billing Tab — Interactive Invoices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the session billing tab's invoice rows clickable (opens `InvoiceDetailModal`) and add an "Add Invoice" button (opens `AddInvoiceModal` pre-populated with the session's client).

**Architecture:** All changes are confined to `BillingTab` inside `src/pages/SessionNotes.jsx`. Two state variables (`selectedInvoiceId`, `showAddInvoice`) control the two existing modal components. CSS is added to `SessionNotes.css`. A new test file covers the interactive behaviour.

**Tech Stack:** React 18, Vitest, @testing-library/react, @testing-library/user-event, lucide-react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/SessionNotes.jsx` | Modify | Add imports, state, clickable rows, Add Invoice button, modal renders in `BillingTab` |
| `src/pages/SessionNotes.css` | Modify | Clickable card cursor/hover, `bl-btn-add` button style |
| `src/pages/SessionNotes.test.jsx` | Create | Tests for invoice click → modal, Add Invoice → modal |

---

### Task 1: Write failing tests

**Files:**
- Create: `src/pages/SessionNotes.test.jsx`

- [ ] **Step 1: Create the test file**

```jsx
// src/pages/SessionNotes.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ClientsProvider } from '../context/ClientsContext'
import { BillingProvider } from '../context/BillingContext'
import { SessionsProvider } from '../context/SessionsContext'
import SessionNotes from './SessionNotes'

function renderSessionPage(sessionId = 'sess-1') {
  return render(
    <MemoryRouter initialEntries={[`/sessions/${sessionId}`]}>
      <AuthProvider>
        <ClientsProvider>
          <BillingProvider>
            <SessionsProvider>
              <Routes>
                <Route path="/sessions" element={<div>sessions list</div>} />
                <Route path="/sessions/:id" element={<SessionNotes />} />
              </Routes>
            </SessionsProvider>
          </BillingProvider>
        </ClientsProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('<SessionNotes> billing tab', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })
  afterEach(() => vi.restoreAllMocks())

  async function openBillingTab() {
    const user = userEvent.setup()
    renderSessionPage('sess-1')
    await user.click(screen.getByRole('button', { name: 'Billing' }))
    return user
  }

  it('renders invoice rows in the billing tab', async () => {
    await openBillingTab()
    expect(screen.getByText('inv-001')).toBeInTheDocument()
    expect(screen.getByText('inv-002')).toBeInTheDocument()
  })

  it('clicking an invoice row opens InvoiceDetailModal', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByText('inv-001'))
    // InvoiceDetailModal renders the invoice code in its header
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
  })

  it('InvoiceDetailModal closes when close button is clicked', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByText('inv-001'))
    expect(screen.getByText('INV-0001')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('INV-0001')).not.toBeInTheDocument()
  })

  it('Add Invoice button opens AddInvoiceModal', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
  })

  it('AddInvoiceModal is pre-populated with the session client', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    // sess-1 belongs to c1 = Arjun Sharma; modal skips to step 2 and shows client name
    expect(screen.getByText('Arjun Sharma')).toBeInTheDocument()
  })

  it('AddInvoiceModal closes when close button is clicked', async () => {
    const user = await openBillingTab()
    await user.click(screen.getByRole('button', { name: /Add Invoice/i }))
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('New Invoice')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they all fail**

```bash
npx vitest run src/pages/SessionNotes.test.jsx
```

Expected: all 6 tests FAIL — most will fail because invoice rows have no `onClick` and there is no Add Invoice button.

---

### Task 2: Add CSS for interactive invoice cards and Add Invoice button

**Files:**
- Modify: `src/pages/SessionNotes.css`

- [ ] **Step 1: Add styles at the end of `src/pages/SessionNotes.css`**

Append after the last line (`.bl-act-event { color: var(--ink-700); }`):

```css
.bl-invoice-card.bl-clickable {
  cursor: pointer;
}

.bl-invoice-card.bl-clickable:hover {
  background: var(--bg-hover, #f5f4f2);
}

.bl-btn-add {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-4);
  background: var(--green-700);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.bl-btn-add:hover { background: var(--green-900); }

.bl-summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
}
```

---

### Task 3: Implement interactive BillingTab

**Files:**
- Modify: `src/pages/SessionNotes.jsx`

- [ ] **Step 1: Add `Plus` to the lucide-react import and add modal imports**

Change the top of the file from:

```js
import { Video, MapPin, Phone, CheckCircle2, AlertTriangle, Circle, Clock, CalendarDays, Mic, PenLine } from 'lucide-react'
```

to:

```js
import { Video, MapPin, Phone, CheckCircle2, AlertTriangle, Circle, Clock, CalendarDays, Mic, PenLine, Plus } from 'lucide-react'
```

Add after the existing component imports (after the `import './SessionNotes.css'` line):

```js
import InvoiceDetailModal from '../components/InvoiceDetailModal'
import AddInvoiceModal from '../components/AddInvoiceModal'
```

- [ ] **Step 2: Replace the `BillingTab` component**

Replace the entire `BillingTab` function (lines 369–408) with:

```jsx
function BillingTab({ session }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [showAddInvoice, setShowAddInvoice]       = useState(false)

  return (
    <div className="bl-tab">
      <div className="bl-summary-row">
        <div className="bl-summary">
          <div className="bl-total">₹{session.billing.total.toLocaleString('en-IN')}</div>
          {session.billing.outstanding > 0 && (
            <div className="bl-outstanding">₹{session.billing.outstanding.toLocaleString('en-IN')} outstanding</div>
          )}
        </div>
        <button className="bl-btn-add" onClick={() => setShowAddInvoice(true)}>
          <Plus size={12} /> Add Invoice
        </button>
      </div>

      <div className="bl-invoices">
        {session.billing.invoices.map(inv => (
          <div
            key={inv.id}
            className="bl-invoice-card bl-clickable"
            onClick={() => setSelectedInvoiceId(inv.id)}
          >
            <div className="bl-inv-left">
              <div className="bl-inv-id">{inv.id}</div>
              <div className="bl-inv-service">{inv.service}</div>
              <div className="bl-inv-date">{inv.date}</div>
            </div>
            <div className="bl-inv-right">
              <span className={`bl-inv-badge ${inv.status}`}>{inv.status}</span>
              <div className={`bl-inv-amount ${inv.status === 'draft' ? 'outstanding' : ''}`}>
                ₹{inv.amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {session.billing.activity.length > 0 && (
        <div className="bl-activity">
          <div className="bl-act-title">Activity</div>
          {session.billing.activity.map(a => (
            <div key={a.id} className="bl-act-row">
              <span className="bl-act-time">{a.timestamp}</span>
              <span className="bl-act-event">{a.event}</span>
            </div>
          ))}
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {showAddInvoice && (
        <AddInvoiceModal
          preselectedClientId={session.clientId}
          onClose={() => setShowAddInvoice(false)}
        />
      )}
    </div>
  )
}
```

---

### Task 4: Run tests and verify all pass

**Files:**
- Test: `src/pages/SessionNotes.test.jsx`

- [ ] **Step 1: Run the test suite**

```bash
npx vitest run src/pages/SessionNotes.test.jsx
```

Expected: all 6 tests PASS.

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all tests pass with no new failures.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SessionNotes.jsx src/pages/SessionNotes.css src/pages/SessionNotes.test.jsx
git commit -m "feat: make session billing tab invoices interactive"
```
