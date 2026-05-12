import './Placeholder.css'

export default function Placeholder({ title }) {
  return (
    <div className="placeholder-page">
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
      </header>
      <div className="placeholder-body">
        <p className="placeholder-text">This section is coming soon.</p>
      </div>
    </div>
  )
}
