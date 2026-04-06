import Link from 'next/link'

const VENUES = [
  { id: 'arxiv', name: 'arXiv', desc: 'Preprints in AI, ML, Computer Vision, NLP' },
  { id: 'neurips', name: 'NeurIPS', desc: 'Neural Information Processing Systems' },
  { id: 'iclr', name: 'ICLR', desc: 'International Conference on Learning Representations' },
  { id: 'icml', name: 'ICML', desc: 'International Conference on Machine Learning' },
  { id: 'cvpr', name: 'CVPR', desc: 'Computer Vision and Pattern Recognition' },
  { id: 'iccv', name: 'ICCV', desc: 'International Conference on Computer Vision' },
  { id: 'eccv', name: 'ECCV', desc: 'European Conference on Computer Vision' },
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
              <div className="card-acronym">{venue.id.toUpperCase()}</div>
              <h3>{venue.name}</h3>
              <p>{venue.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}