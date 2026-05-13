# Finalize Session — Auto-Transition Design

**Date:** 2026-05-14
**Scope:** `src/pages/SessionNotes.jsx` + `src/pages/SessionNotes.css`

---

## Problem

The "Finalize Session" button in the Session Wrap-Up sidebar is always active regardless of task completion state. The therapist must click the button to discover what's still pending, and finalization requires an explicit click + navigation away from the page.

## Goal

The button should reactively reflect the session's readiness state at all times:
- All three wrap-up tasks done → button auto-transitions to "Session Finalized" (inactive, positive visual)
- Any task reverts to incomplete → button returns to "Finalize Session" (active, clickable)
- Session status in context stays in sync automatically — no manual click required to finalize

---

## The Three Finalization Tasks

| Task | Condition for "done" |
|------|----------------------|
| PSE | `session.pse.completed || session.pse.skipped` |
| Note locked | `session.noteLocked === true` |
| Billing cleared | `session.billing.outstanding === 0` |

Note: PSE skipped counts as acceptable for finalization but still shows an amber warning triangle in the checklist. This is intentional — skipped is allowed but still flagged.

---

## Design

### 1. `allDone` derived value

```js
const allDone = (session.pse.completed || session.pse.skipped)
             && session.noteLocked
             && session.billing.outstanding === 0
```

Computed directly in the component body on every render. No state required.

### 2. `useEffect` — auto-status sync

```js
useEffect(() => {
  if (allDone && session.status !== 'finalized') {
    updateSession(id, { status: 'finalized' })
  } else if (!allDone && session.status === 'finalized') {
    updateSession(id, { status: 'completed' })
  }
}, [allDone])
```

- Guard condition (`session.status !== 'finalized'`) prevents infinite update loops
- Reversion restores status to `'completed'` — the correct prior state for a session that occurred but is not yet finalized
- Effect dependencies: `[allDone, id, session.status, updateSession]` — include all referenced values to satisfy exhaustive-deps; the guard conditions ensure the effect body is a no-op on most renders

### 3. Button rendering

```jsx
<button
  className={`sn-finalize-btn ${allDone ? 'sn-finalize-btn--done' : ''}`}
  onClick={!allDone ? handleFinalize : undefined}
  disabled={allDone}
>
  {allDone ? 'Session Finalized' : 'Finalize Session'}
</button>
```

### 4. `handleFinalize` — stripped to warning only

Remove the `updateSession` and `navigate` calls from `handleFinalize`. The function now only shows the incomplete-task warning when the therapist clicks while tasks are still pending:

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

The warning UI and `showFinalizeWarning` state are retained — still useful as a summary of what's left.

### 5. CSS — finalized visual state

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

Calm, positive-but-inert. Green-toned to signal success, clearly not a pressable action. The active state (solid `--green-700` bg, white text) is unchanged.

---

## What does NOT change

- The three `ChecklistItem` components and their done/warn logic are unchanged
- PSE skipped continues to render an amber triangle in the checklist
- `showFinalizeWarning` state and warning UI are retained for the active-button state
- Navigate-away-on-finalize is removed (finalization happens in-place; therapist stays on the page)
- Note unlock functionality is explicitly out of scope — to be handled separately

---

## Files changed

| File | Change |
|------|--------|
| `src/pages/SessionNotes.jsx` | Add `allDone`, add `useEffect`, update `handleFinalize`, update button JSX |
| `src/pages/SessionNotes.css` | Add `.sn-finalize-btn--done` modifier |
