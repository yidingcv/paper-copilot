'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'

const VENUES = [
  { id: 'all', name: 'All', icon: '🌐' },
  { id: 'arxiv', name: 'arXiv', icon: '📚', purple: true },
  { id: 'neurips', name: 'NeurIPS', icon: '🧠' },
  { id: 'iclr', name: 'ICLR', icon: '🔬' },
  { id: 'icml', name: 'ICML', icon: '📊' },
  { id: 'cvpr', name: 'CVPR', icon: '👁️' },
  { id: 'iccv', name: 'ICCV', icon: '📷' },
  { id: 'eccv', name: 'ECCV', icon: '🎯' },
]

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState('all')

  const searchArxiv = async (query: string) => {
    if (!query.trim()) return
    setLoading(true)
    setHasSearched(true)

    try {
      const encodedQuery = encodeURIComponent(query)
      const response = await fetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&max_results=20&sortBy=relevance&sortOrder=descending`
      )
      const text = await response.text()

      // Parse XML response
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')
      const entries = doc.querySelectorAll('entry')

      const results: Paper[] = []
      entries.forEach((entry) => {
        const title = entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || ''
        const authors = Array.from(entry.querySelectorAll('author name')).map(n => n.textContent || '')
        const summary = entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || ''
        const id = entry.querySelector('id')?.textContent || ''
        const published = entry.querySelector('published')?.textContent || ''
        const arxivId = id.split('/').pop() || ''

        results.push({
          id: `arxiv-${arxivId}`,
          venue: 'arxiv',
          year: published.split('-')[0],
          title,
          authors,
          abstract: summary,
          arxivId,
        })
      })

      setPapers(results)
    } catch (error) {
      console.error('Search error:', error)
      setPapers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchArxiv(searchQuery)
  }

  const filteredPapers = selectedVenue === 'all'
    ? papers
    : papers.filter(p => p.venue === selectedVenue)

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <h1>Track Research Papers Effortlessly</h1>
        <p>Search across arXiv and top AI/ML conferences in one place</p>
        <form className="hero-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by title, author, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </section>

      {/* Main Content */}
      <div className="main">
        {!hasSearched ? (
          <>
            {/* Welcome */}
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Browse Conferences</h2>
              </div>
              <div className="cards-grid">
                {VENUES.filter(v => v.id !== 'all').map((venue) => (
                  <Link key={venue.id} href={`/conferences/${venue.id}`} className="card">
                    <div className={`card-icon ${venue.purple ? 'purple' : ''}`}>{venue.icon}</div>
                    <h3>{venue.name}</h3>
                    <p>{venue.id === 'arxiv' ? 'cs.AI, cs.LG, cs.CV' : 'Papers from OpenReview'}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Quick Search */}
            <section className="section">
              <h2 className="section-title">Quick Search</h2>
              <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>
                Try searching for topics like &quot;transformers&quot;, &quot;reinforcement learning&quot;, or &quot;computer vision&quot;
              </p>
            </section>
          </>
        ) : (
          <div className="search-results">
            <Link href="/" className="back-link">← Back to Home</Link>

            {/* Venue Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {VENUES.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedVenue === venue.id ? 'var(--primary)' : 'var(--border)',
                    background: selectedVenue === venue.id ? 'var(--primary)' : 'white',
                    color: selectedVenue === venue.id ? 'var(--text-darker)' : 'var(--text)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {venue.icon} {venue.name}
                </button>
              ))}
            </div>

            <h2>Search Results ({filteredPapers.length})</h2>

            {loading ? (
              <div className="empty-state">
                <p>Searching arXiv...</p>
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="empty-state">
                <p>No papers found. Try a different search term.</p>
              </div>
            ) : (
              <div className="cards-grid">
                {filteredPapers.map((paper) => (
                  <article key={paper.id} className="paper-card">
                    <h3>{paper.title}</h3>
                    <p className="authors">
                      {paper.authors?.slice(0, 3).join(', ')}
                      {paper.authors && paper.authors.length > 3 ? ' et al.' : ''}
                    </p>
                    <p className="abstract">{paper.abstract}</p>
                    <div className="paper-meta">
                      <span className="paper-tag">{paper.venue?.toUpperCase()}</span>
                      {paper.year && <span className="paper-tag">{paper.year}</span>}
                      {paper.arxivId && (
                        <a
                          href={`https://arxiv.org/abs/${paper.arxivId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="paper-link"
                        >
                          arXiv →
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}