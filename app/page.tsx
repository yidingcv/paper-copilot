'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'
import SearchOverlay from '@/components/SearchOverlay'

const CONFERENCES = [
  { id: 'arxiv', name: 'arXiv', desc: 'Preprints in AI, ML, Computer Vision, NLP' },
  { id: 'neurips', name: 'NeurIPS', desc: 'Neural Information Processing Systems' },
  { id: 'iclr', name: 'ICLR', desc: 'International Conference on Learning Representations' },
  { id: 'icml', name: 'ICML', desc: 'International Conference on Machine Learning' },
  { id: 'cvpr', name: 'CVPR', desc: 'Computer Vision and Pattern Recognition' },
  { id: 'iccv', name: 'ICCV', desc: 'International Conference on Computer Vision' },
  { id: 'eccv', name: 'ECCV', desc: 'European Conference on Computer Vision' },
]

const JOURNALS = [
  { id: 'tpami', name: 'TPAMI', desc: 'IEEE Transactions on Pattern Analysis and Machine Intelligence' },
  { id: 'tip', name: 'TIP', desc: 'IEEE Transactions on Image Processing' },
  { id: 'tmm', name: 'TMM', desc: 'IEEE Transactions on Multimedia' },
  { id: 'ijcv', name: 'IJCV', desc: 'International Journal of Computer Vision' },
]

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set())
  const [searchMode, setSearchMode] = useState<'arxiv' | 'all'>('arxiv')

  const toggleAbstract = (paperId: string) => {
    const newExpanded = new Set(expandedAbstracts)
    if (newExpanded.has(paperId)) {
      newExpanded.delete(paperId)
    } else {
      newExpanded.add(paperId)
    }
    setExpandedAbstracts(newExpanded)
  }

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
        const categories = Array.from(entry.querySelectorAll('category'))
          .map(c => c.getAttribute('term') || '')
          .filter(Boolean)
        const primaryCategory = categories[0] || ''

        results.push({
          id: `arxiv-${arxivId}`,
          venue: 'arxiv',
          year: published.split('-')[0],
          title,
          authors,
          abstract: summary,
          arxivId,
          tags: categories,
          category: primaryCategory,
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
    if (searchMode === 'arxiv') {
      searchArxiv(searchQuery)
    }
    // 'all' mode is handled by SearchOverlay component
  }

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <h1>Track Research Papers Effortlessly</h1>
        <p>Search across arXiv, top conferences, and journals in one place</p>
        <form className="hero-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by title, author, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="searchMode"
              checked={searchMode === 'arxiv'}
              onChange={() => setSearchMode('arxiv')}
            />
            <span style={{ fontSize: '0.9em' }}>arXiv only</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="searchMode"
              checked={searchMode === 'all'}
              onChange={() => setSearchMode('all')}
            />
            <span style={{ fontSize: '0.9em' }}>All venues</span>
          </label>
        </div>
        {searchMode === 'all' && <SearchOverlay />}
      </section>

      {/* Main Content */}
      <div className="main">
        {!hasSearched ? (
          <>
            {/* Browse Conferences */}
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Conferences</h2>
              </div>
              <div className="cards-grid">
                {CONFERENCES.map((conf) => (
                  <Link key={conf.id} href={`/conferences/${conf.id}`} className="card">
                    <div className="card-acronym">{conf.id.toUpperCase()}</div>
                    <h3>{conf.name}</h3>
                    <p>{conf.desc}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Browse Journals */}
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Journals</h2>
              </div>
              <div className="cards-grid">
                {JOURNALS.map((journal) => (
                  <Link key={journal.id} href={`/conferences/${journal.id}`} className="card">
                    <div className="card-acronym">{journal.id.toUpperCase()}</div>
                    <h3>{journal.name}</h3>
                    <p>{journal.desc}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Quick Search Tips */}
            <section className="section">
              <h2 className="section-title">Quick Search</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.75em' }}>
                Try searching for topics like &quot;transformers&quot;, &quot;reinforcement learning&quot;, or &quot;diffusion models&quot;
              </p>
            </section>
          </>
        ) : (
          <div className="search-results">
            <Link href="/" className="back-link">Back to Home</Link>

            <h2>Search Results ({papers.length})</h2>

            {loading ? (
              <div className="empty-state">
                <p>Searching arXiv...</p>
              </div>
            ) : papers.length === 0 ? (
              <div className="empty-state">
                <p>No papers found. Try a different search term.</p>
              </div>
            ) : (
              <div className="cards-grid">
                {papers.map((paper) => (
                  <article key={paper.id} className="paper-card">
                    <h3>{paper.title}</h3>
                    <p className="authors">
                      {paper.authors?.slice(0, 3).join(', ')}
                      {paper.authors && paper.authors.length > 3 ? ' et al.' : ''}
                    </p>
                    <div className="paper-meta">
                      <span className="paper-tag">arXiv</span>
                      {paper.year && <span className="paper-tag">{paper.year}</span>}
                      {paper.category && <span className="paper-tag" style={{ background: 'var(--primary)', color: 'white' }}>{paper.category}</span>}
                    </div>
                    <p className="abstract" style={{ marginTop: '0.75em' }}>
                      {paper.abstract && paper.abstract.length > 300 ? (
                        expandedAbstracts.has(paper.id) ? (
                          paper.abstract
                        ) : (
                          <>
                            {paper.abstract.slice(0, 300)}...
                            <button
                              onClick={() => toggleAbstract(paper.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9em', padding: 0, marginLeft: '0.25em' }}
                            >
                              Show more
                            </button>
                          </>
                        )
                      ) : paper.abstract}
                    </p>
                    {paper.abstract && paper.abstract.length > 300 && expandedAbstracts.has(paper.id) && (
                      <button
                        onClick={() => toggleAbstract(paper.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9em', padding: 0, marginTop: '0.25em' }}
                      >
                        Show less
                      </button>
                    )}
                    <div className="paper-links" style={{ marginTop: '0.75em', display: 'flex', gap: '1rem' }}>
                      {paper.arxivId && (
                        <>
                          <a
                            href={`https://arxiv.org/abs/${paper.arxivId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="paper-link"
                          >
                            arXiv Abstract →
                          </a>
                          <a
                            href={`https://arxiv.org/pdf/${paper.arxivId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="paper-link"
                          >
                            PDF ↓
                          </a>
                        </>
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