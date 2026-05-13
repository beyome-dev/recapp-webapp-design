# Finalize Session Auto-Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Finalize Session" button in SessionNotes automatically switch to "Session Finalized" (disabled) when all three wrap-up tasks are complete, and revert when any task becomes incomplete again.

**Architecture:** Derive a boolean `allDone` from the three task states on every render; a `useEffect` keeps `session.status` in sync with it; the button renders from `allDone` alone. No new state variables needed.

**Tech Stack:** React 19, Vitest, @testing-library/react, @testing-library/user-event

---

## File Map

| File | What changes |
|------|-------------|
| `src/pages/SessionNotes.jsx` | Add `allDone` derived value, add `useEffect`, update button JSX, strip `handleFinalize` to warning-only |
| `src/pages/SessionNotes.css` | Add `.sn-finalize-btn--done` modifier class |
| `src/pages/SessionNotes.test.jsx` | Add tests for auto-transition behaviour |

---

## Seed data reference (sess-1)

`sess-1` starts with:
- `pse.completed: true`, `pse.skipped: false` — PSE already done
- `noteLocked: false` — note not locked
- `billing.outstanding: 1750` — inv-002 is still draft/unpaid

So for `sess-1`, the two remaining tasks are: lock the note + pay inv-002.

---

## Task 1: Write failing tests for the auto-transition

**Files:**
- Modify: `src/pages/SessionNotes.test.jsx`

- [ ] **Step 1: Add a new `describe` block for wrap-up auto-transition tests**

Open `src/pages/SessionNotes.test.jsx`. After the closing `})` of the existing `describe('<SessionNotes> billing tab', ...)` block, append:

```jsx
describe('<SessionNotes> finalize button auto-transition', () => {
  afterEach(() => vi.restoreAllMocks())

  async function completeAllTasks() {
    renderSessionPage('sess-1')
    const user = userEvent.setup()

    // Task 1: lock the note (PSE is already completed in seed data)
    await user.click(screen.getByRole('button', { name: 'Lock' }))

    // Task 2: pay inv-002 to clear outstanding balance
    await user.click(screen.getByRole('button', { name: 'Billing' }))
    await user.click(screen.getByText('inv-002'))
    await user.click(screen.getByRole('button', { name: /Mark as paid/i }))
    await user.click(screen.getByRole('button', { name: 'Cash' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    return user
  }

  it('shows "Finalize Session" button when tasks are incomplete', () => {
    renderSessionPage('sess-1')
    // note is unlocked and billing pending — button should be active
    expect(screen.getByRole('button', { name: 'Finalize Session' })).not.toBeDisabled()
  })

  it('shows "Session Finalized" and disables button when all tasks complete', async () => {
    await completeAllTasks()
    expect(screen.getByRole('button', { name: 'Session Finalized' })).toBeDisabled()
  })

  it('hides "Finalize Session" once all tasks are complete', async () => {
    await completeAllTasks()
    expect(screen.queryByRole('button', { name: 'Finalize Session' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/pages/SessionNotes.test.jsx --reporter=verbose
```

Expected: the two new tests (`shows "Session Finalized"...` and `hides "Finalize Session"...`) fail. The first test (`shows "Finalize Session" button when tasks are incomplete`) should pass already.

---

## Task 2: Add `allDone` derived value and `useEffect`

**Files:**
- Modify: `src/pages/SessionNotes.jsx`

- [ ] **Step 1: Add `useEffect` to the React import**

At line 2, the import currently reads:

```js
import { useState } from 'react'
```

Change it to:

```js
import { useState, useEffect } from 'react'
```

- [ ] **Step 2: Add `allDone` derived value after the existing `pseDone`/`pseSkipped`/`noteLocked`/`billingOk` lines**

Find lines 101–104 in `SessionNotes.jsx`:

```js
  const pseDone    = session.pse.completed
  const pseSkipped = !session.pse.completed && session.pse.skipped
  const noteLocked = session.noteLocked
  const billingOk  = session.billing.outstanding === 0
```

Add one line directly after:

```js
  const pseDone    = session.pse.completed
  const pseSkipped = !session.pse.completed && session.pse.skipped
  const noteLocked = session.noteLocked
  const billingOk  = session.billing.outstanding === 0

  const allDone = (session.pse.completed || session.pse.skipped)
               && session.noteLocked
               && session.billing.outstanding === 0
```

- [ ] **Step 3: Add `useEffect` for auto-status sync**

Add the following block immediately after the `allDone` line (still inside the `SessionNotes` function body, before the `return`):

```js
  useEffect(() => {
    if (allDone && session.status !== 'finalized') {
      updateSession(id, { status: 'finalized' })
    } else if (!allDone && session.status === 'finalized') {
      updateSession(id, { status: 'completed' })
    }
  }, [allDone, id, session.status, updateSession])
```

- [ ] **Step 4: Run tests — they should still fail (button JSX not updated yet)**

```bash
npx vitest run src/pages/SessionNotes.test.jsx --reporter=verbose
```

Expected: the two new tests still fail with something like `Unable to find role="button" name="Session Finalized"`.

---

## Task 3: Update button JSX and strip `handleFinalize`

**Files:**
- Modify: `src/pages/SessionNotes.jsx`

- [ ] **Step 1: Replace the button JSX**

Find lines 179–181:

```jsx
            <button className="sn-finalize-btn" onClick={handleFinalize}>
              Finalize Session
            </button>
```

Replace with:

```jsx
            <button
              className={`sn-finalize-btn${allDone ? ' sn-finalize-btn--done' : ''}`}
              onClick={!allDone ? handleFinalize : undefined}
              disabled={allDone}
            >
              {allDone ? 'Session Finalized' : 'Finalize Session'}
            </button>
```

- [ ] **Step 2: Strip `handleFinalize` to warning-only**

Find the full `handleFinalize` function (lines 60–76):

```js
  function handleFinalize() {
    if (showFinalizeWarning) {
      setShowFinalizeWarning(false)
      return
    }
    const incomplete = []
    if (!session.pse.completed && !session.pse.skipped) incomplete.push('PSE not completed')
    if (!session.noteLocked) incomplete.push('Note not locked')
    if (session.billing.outstanding > 0) incomplete.push('Billing pending')

    if (incomplete.length > 0) {
      setShowFinalizeWarning(incomplete)
    } else {
      updateSession(id, { status: 'finalized' })
      navigate('/sessions')
    }
  }
```

Replace with:

```js
  function handleFinalize() {
    if (showFinalizeWarning) {
      setShowFinalizeWarning(false)
      return
    }
    const incomplete = []
    if (!session.pse.completed && !session.pse.skipped) incomplete.push('PSE not completed')
    if (!session.noteLocked) incomplete.push('Note not locked')
    if (session.billing.outstanding > 0) incomplete.push('Billing pending')
    if (incomplete.length > 0) setShowFinalizeWarning(incomplete)
  }
```

- [ ] **Step 3: Run all tests and verify they pass**

```bash
npx vitest run src/pages/SessionNotes.test.jsx --reporter=verbose
```

Expected: all tests pass, including the two new ones. If any pre-existing tests fail, check whether they expected `navigate('/sessions')` to be called after finalization — that behaviour has been intentionally removed.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SessionNotes.jsx src/pages/SessionNotes.test.jsx
git commit -m "feat: auto-transition finalize button when all wrap-up tasks complete"
```

---

## Task 4: Add the finalized visual state CSS

**Files:**
- Modify: `src/pages/SessionNotes.css`

- [ ] **Step 1: Add `.sn-finalize-btn--done` modifier**

Open `src/pages/SessionNotes.css`. Find the existing hover rule:

```css
.sn-finalize-btn:hover { opacity: 0.9; }
```

Add immediately after it:

```css
.sn-finalize-btn--done {
  background: var(--green-50);
  color: var(--green-700);
  border: 1px solid var(--green-100);
  cursor: default;
  opacity: 1;
}
.sn-finalize-btn--done:hover { opacity: 1; }
```

- [ ] **Step 2: Verify visually**

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`, log in as `therapist@recapp.me`, open the session for Arjun Sharma. Confirm:
1. Button shows "Finalize Session" (green, active) — note is unlocked and billing pending
2. Click "Lock" in the checklist → billing still pending, button stays "Finalize Session"
3. Switch to Billing tab → click inv-002 → Mark as paid → Cash → Confirm payment
4. Button auto-transitions to "Session Finalized" (pale green, disabled — no hover effect)
5. No navigation occurs; therapist stays on the page

- [ ] **Step 3: Commit**

```bash
git add src/pages/SessionNotes.css
git commit -m "style: add finalized visual state for sn-finalize-btn"
```
