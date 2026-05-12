// src/components/TemplatePicker.jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import './TemplatePicker.css'

const TEMPLATES = [
  {
    id: 'enhanced',
    label: 'Enhanced Note',
    colour: '#2C5C40',
    description: 'AI-structured narrative note covering presenting concerns, session content, clinical observations, and plan.',
    sections: ['Presenting Concerns', 'Session Content', 'Clinical Observations', 'Plan & Goals'],
  },
  {
    id: 'soap',
    label: 'SOAP',
    colour: '#1D4ED8',
    description: 'Subjective–Objective–Assessment–Plan format. Standard clinical documentation structure.',
    sections: ['Subjective', 'Objective', 'Assessment', 'Plan'],
  },
  {
    id: 'dap',
    label: 'DAP',
    colour: '#B45309',
    description: 'Data–Assessment–Plan. Shorter format combining subjective and objective into data.',
    sections: ['Data', 'Assessment', 'Plan'],
  },
  {
    id: 'birp',
    label: 'BIRP',
    colour: '#6D28D9',
    description: 'Behaviour–Intervention–Response–Plan. Focuses on observable behaviour and therapeutic response.',
    sections: ['Behaviour', 'Intervention', 'Response', 'Plan'],
  },
]

export default function TemplatePicker({ onClose, onApply }) {
  const [selected, setSelected] = useState('enhanced')
  const tpl = TEMPLATES.find(t => t.id === selected) ?? TEMPLATES[0]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="tp-panel" onClick={e => e.stopPropagation()}>
        <div className="tp-sidebar">
          <div className="tp-sidebar-title">Note Templates</div>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              className={`tp-template-row ${selected === t.id ? 'active' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <div className="tp-dot" style={{ background: t.colour }} />
              {t.label}
            </button>
          ))}
          <button className="tp-template-row tp-custom-row">
            <div className="tp-dot-dashed" />
            Custom template
          </button>
        </div>

        <div className="tp-preview">
          <button className="tp-close" onClick={onClose}><X size={15} /></button>
          <h3 className="tp-preview-title">{tpl.label}</h3>
          <p className="tp-preview-desc">{tpl.description}</p>
          <div className="tp-sections">
            {tpl.sections.map(s => (
              <div key={s} className="tp-section-card">
                <div className="tp-section-name">{s}</div>
                <div className="tp-section-hint">Add content for this section…</div>
              </div>
            ))}
          </div>
          <div className="tp-footer">
            <button className="tp-cancel" onClick={onClose}>Cancel</button>
            <button className="tp-apply" onClick={() => onApply(selected)}>Apply Template</button>
          </div>
        </div>
      </div>
    </div>
  )
}
