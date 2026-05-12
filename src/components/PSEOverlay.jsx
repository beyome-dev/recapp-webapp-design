// src/components/PSEOverlay.jsx
import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useSessions } from '../context/SessionsContext'
import './PSEOverlay.css'

const EMOTION_OPTIONS = ['Anxious', 'Overwhelmed', 'Avoidant', 'Sad', 'Angry', 'Hopeful', 'Numb', 'Ashamed']
const INTERVENTION_OPTIONS = ['CBT', 'DBT', 'Mindfulness', 'Psychoeducation', 'Exposure', 'Narrative']
const EXIT_OPTIONS = [
  'Slightly calmer, but still processing',
  'Significantly improved',
  'Neutral — no significant change',
  'Distressed — needs follow-up',
]

export default function PSEOverlay({ session, client, onDone, onSkip }) {
  const { updatePSE } = useSessions()

  const [emotions, setEmotions]                 = useState(session.pse?.emotions ?? [])
  const [intervention, setIntervention]         = useState(session.pse?.intervention ?? '')
  const [exitState, setExitState]               = useState(session.pse?.exitState ?? '')
  const [customEmotion, setCustomEmotion]       = useState('')
  const [addingEmotion, setAddingEmotion]       = useState(false)
  const [customIntervention, setCustomIntervention] = useState('')
  const [addingIntervention, setAddingIntervention] = useState(false)

  function toggleEmotion(e) {
    setEmotions(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]
    )
  }

  function handleConfirm() {
    updatePSE(session.id, {
      completed: true,
      skipped: false,
      emotions,
      intervention,
      exitState,
    })
    onDone()
  }

  function handleSkip() {
    updatePSE(session.id, { completed: false, skipped: true })
    onSkip()
  }

  const allEmotions = [
    ...EMOTION_OPTIONS,
    ...emotions.filter(e => !EMOTION_OPTIONS.includes(e)),
  ]
  const allInterventions = [
    ...INTERVENTION_OPTIONS,
    ...(intervention && !INTERVENTION_OPTIONS.includes(intervention) ? [intervention] : []),
  ]

  return (
    <div className="pse-backdrop">
      <div className="pse-panel">
        <div className="pse-header">
          <div>
            <div className="pse-title">Post-Session Evaluation</div>
            <div className="pse-subtitle">
              Review the emotional arc of this session with {client?.name}.
            </div>
          </div>
          <button className="pse-skip" onClick={handleSkip}>Skip for now</button>
        </div>

        <div className="pse-body">
          {/* Emotions */}
          <div className="pse-section">
            <div className="pse-section-label">Emotions present during session</div>
            <div className="pse-chip-grid">
              {allEmotions.map(e => (
                <button
                  key={e}
                  className={`pse-chip ${emotions.includes(e) ? 'pse-chip-emotion' : ''}`}
                  onClick={() => toggleEmotion(e)}
                >
                  {e}
                </button>
              ))}
              {addingEmotion ? (
                <div className="pse-add-inline">
                  <input
                    autoFocus
                    className="pse-add-input"
                    placeholder="Emotion…"
                    value={customEmotion}
                    onChange={e => setCustomEmotion(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customEmotion.trim()) {
                        setEmotions(prev => [...prev, customEmotion.trim()])
                        setCustomEmotion('')
                        setAddingEmotion(false)
                      }
                      if (e.key === 'Escape') setAddingEmotion(false)
                    }}
                  />
                </div>
              ) : (
                <button className="pse-chip pse-chip-add" onClick={() => setAddingEmotion(true)}>
                  <Plus size={10} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Intervention */}
          <div className="pse-section">
            <div className="pse-section-label">Intervention used</div>
            <div className="pse-chip-grid">
              {allInterventions.map(i => (
                <button
                  key={i}
                  className={`pse-chip ${intervention === i ? 'pse-chip-intervention' : ''}`}
                  onClick={() => setIntervention(i === intervention ? '' : i)}
                >
                  {i}
                </button>
              ))}
              {addingIntervention ? (
                <div className="pse-add-inline">
                  <input
                    autoFocus
                    className="pse-add-input"
                    placeholder="Intervention…"
                    value={customIntervention}
                    onChange={e => setCustomIntervention(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customIntervention.trim()) {
                        setIntervention(customIntervention.trim())
                        setCustomIntervention('')
                        setAddingIntervention(false)
                      }
                      if (e.key === 'Escape') setAddingIntervention(false)
                    }}
                  />
                </div>
              ) : (
                <button className="pse-chip pse-chip-add" onClick={() => setAddingIntervention(true)}>
                  <Plus size={10} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Exit state */}
          <div className="pse-section">
            <div className="pse-section-label">Client left the session feeling</div>
            <div className="pse-exit-list">
              {EXIT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  className={`pse-exit-row ${exitState === opt ? 'selected' : ''}`}
                  onClick={() => setExitState(opt === exitState ? '' : opt)}
                >
                  <div className={`pse-dot ${exitState === opt ? 'filled' : ''}`} />
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pse-footer">
          <div className="pse-footer-note">
            Skipped PSE can be completed<br />from the session notes page.
          </div>
          <button className="pse-confirm-btn" onClick={handleConfirm}>
            <Check size={13} />
            Confirm &amp; Continue
          </button>
        </div>
      </div>
    </div>
  )
}
