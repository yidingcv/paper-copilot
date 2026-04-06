import Link from 'next/link'

const VENUES = [
  { id: 'arxiv', name: 'arXiv', desc: 'cs.AI, cs.LG, cs.CV, cs.CL', icon: '📚' },
  { id: 'neurips', name: 'NeurIPS', desc: '2024, 2023', icon: '🧠' },
  { id: 'iclr', name: 'ICLR', desc: '2025, 2024, 2023', icon: '🔬' },
  { id: 'icml', name: 'ICML', desc: '2024, 2023', icon: '📊' },
  { id: 'cvpr', name: 'CVPR', desc: '2024, 2023', icon: '👁️' },
  { id: 'iccv', name: 'ICCV', desc: '2023, 2021', icon: '📷' },
  { id: 'eccv', name: 'ECCV', desc: '2024, 2022', icon: '🎯' },
]

export default function ConferencesPage() {
  return (
    <main>
      <div className="page-header">
        <div className="container">
          <h1>Conferences</h1>
          <p>Browse papers from top AI/ML conferences and arXiv</p>
        </div>
      </div>

      <div className="main">
        <Link href="/" className="back-link">← Back to Home</Link>

        <div className="cards-grid">
          {VENUES.map((venue) => (
            <Link
              key={venue.id}
              href={`/conferences/${venue.id}`}
              className="card"
            >
              <div className={`card-icon ${venue.id === 'arxiv' ? 'purple' : ''}`}>{venue.icon}</div>
              <h3>{venue.name}</h3>
              <p>{venue.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}