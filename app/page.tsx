'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'

interface SearchPaper {
  id: string
  venue: string
  year?: string
  title: string
  authors: string[]
}

const VENUE_NAMES: Record<string, string> = {
  arxiv: 'arXiv',
  cvpr: 'CVPR',
  iccv: 'ICCV',
  eccv: 'ECCV',
  neurips: 'NeurIPS',
  iclr: 'ICLR',
  icml: 'ICML',
  iros: 'IROS',
  icra: 'ICRA',
  aaai: 'AAAI',
  tpami: 'TPAMI',
  tip: 'TIP',
  tmm: 'TMM',
  ijcv: 'IJCV',
  tnnls: 'TNNLS',
  tcsvt: 'TCSVT',
}

const CONFERENCES = [
  { id: 'arxiv', name: 'arXiv', desc: 'Preprints in AI, ML, Computer Vision, NLP' },
  { id: 'neurips', name: 'NeurIPS', desc: 'Neural Information Processing Systems' },
  { id: 'iclr', name: 'ICLR', desc: 'International Conference on Learning Representations' },
  { id: 'icml', name: 'ICML', desc: 'International Conference on Machine Learning' },
  { id: 'cvpr', name: 'CVPR', desc: 'Computer Vision and Pattern Recognition' },
  { id: 'iccv', name: 'ICCV', desc: 'International Conference on Computer Vision' },
  { id: 'eccv', name: 'ECCV', desc: 'European Conference on Computer Vision' },
  { id: 'iros', name: 'IROS', desc: 'Intelligent Robots and Systems' },
  { id: 'icra', name: 'ICRA', desc: 'International Conference on Robotics and Automation' },
  { id: 'aaai', name: 'AAAI', desc: 'Association for the Advancement of Artificial Intelligence' },
]

const JOURNALS = [
  { id: 'tpami', name: 'TPAMI', desc: 'IEEE Transactions on Pattern Analysis and Machine Intelligence' },
  { id: 'tip', name: 'TIP', desc: 'IEEE Transactions on Image Processing' },
  { id: 'tmm', name: 'TMM', desc: 'IEEE Transactions on Multimedia' },
  { id: 'ijcv', name: 'IJCV', desc: 'International Journal of Computer Vision' },
  { id: 'tnnls', name: 'TNNLS', desc: 'IEEE Transactions on Neural Networks and Learning Systems' },
  { id: 'tcsvt', name: 'TCSVT', desc: 'IEEE Transactions on Circuits and Systems for Video Technology' },
]

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set())
  const [searchMode, setSearchMode] = useState<'arxiv' | 'all'>('arxiv')
  const [allPapers, setAllPapers] = useState<SearchPaper[]>([])
  const [indexLoading, setIndexLoading] = useState(false)
  const [allResults, setAllResults] = useState<SearchPaper[]>([])
  const [allResultsTotal, setAllResultsTotal] = useState(0)

  // Load search index when switching to 'all' mode
  useEffect(() => {
    if (searchMode === 'all' && allPapers.length === 0) {
      setIndexLoading(true)
      fetch('/papercc/search-index.json')
        .then(res => res.json())
        .then(data => {
          setAllPapers(data.papers || [])
          setIndexLoading(false)
        })
        .catch(err => {
          console.error('Failed to load search index:', err)
          setIndexLoading(false)
        })
    }
  }, [searchMode, allPapers.length])

  // Search in all venues when query changes
  useEffect(() => {
    if (searchMode === 'all' && searchQuery.length >= 2 && allPapers.length > 0) {
      const lowerQuery = searchQuery.toLowerCase()
      const filtered = allPapers.filter(paper => {
        const titleMatch = paper.title.toLowerCase().includes(lowerQuery)
        const authorMatch = paper.authors?.some(a => a.toLowerCase().includes(lowerQuery))
        return titleMatch || authorMatch
      })
      setAllResults(filtered.slice(0, 100))
      setAllResultsTotal(filtered.length)
    } else if (searchMode === 'all' && searchQuery.length < 2) {
      setAllResults([])
      setAllResultsTotal(0)
    }
  }, [searchQuery, searchMode, allPapers])

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
  }

  // Determine what to show in the main content area
  const showSearchResults = hasSearched || (searchMode === 'all' && searchQuery.length >= 2)

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <h1>Scientific Research Search Engine</h1>
        <p>Search papers from CVPR, ICCV, NeurIPS and other major venues</p>
        <form className="hero-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder={searchMode === 'all' ? 'Search all venues...' : 'Search papers, authors, or keywords...'}
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
              onChange={() => { setSearchMode('arxiv'); setHasSearched(false); }}
            />
            <span style={{ fontSize: '0.9em' }}>arXiv only</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="searchMode"
              checked={searchMode === 'all'}
              onChange={() => { setSearchMode('all'); setHasSearched(false); }}
            />
            <span style={{ fontSize: '0.9em' }}>All venues</span>
          </label>
        </div>

        {searchMode === 'all' && indexLoading && (
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9em' }}>
            Loading search index... (first time may take a moment)
          </p>
        )}
      </section>

      {/* Main Content */}
      <div className="main">
        {showSearchResults ? (
          <div className="search-results">
            <Link href="/" className="back-link" onClick={() => { setHasSearched(false); setSearchQuery(''); }}>← Back to Home</Link>

            {searchMode === 'arxiv' ? (
              <>
                <h2>arXiv Results ({papers.length})</h2>
                {loading ? (
                  <div className="empty-state"><p>Searching arXiv...</p></div>
                ) : papers.length === 0 ? (
                  <div className="empty-state"><p>No papers found. Try a different search term.</p></div>
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
                                <button onClick={() => toggleAbstract(paper.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9em', padding: 0, marginLeft: '0.25em' }}>Show more</button>
                              </>
                            )
                          ) : paper.abstract}
                        </p>
                        {paper.abstract && paper.abstract.length > 300 && expandedAbstracts.has(paper.id) && (
                          <button onClick={() => toggleAbstract(paper.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9em', padding: 0, marginTop: '0.25em' }}>Show less</button>
                        )}
                        <div className="paper-links" style={{ marginTop: '0.75em', display: 'flex', gap: '1rem' }}>
                          {paper.arxivId && (
                            <>
                              <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" rel="noopener noreferrer" className="paper-link">arXiv Abstract →</a>
                              <a href={`https://arxiv.org/pdf/${paper.arxivId}`} target="_blank" rel="noopener noreferrer" className="paper-link">PDF ↓</a>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2>All Venues Results ({allResultsTotal})</h2>
                {allResultsTotal === 0 && !indexLoading && (
                  <div className="empty-state"><p>No papers found. Try a different search term.</p></div>
                )}
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9em' }}>
                  Showing top {allResults.length} results from CVPR, ICCV, ECCV and more.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allResults.map((paper) => (
                    <article key={paper.id} style={{ padding: '1em', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ padding: '0.2em 0.5em', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '0.75em', fontWeight: 600 }}>
                          {VENUE_NAMES[paper.venue] || paper.venue}
                        </span>
                        {paper.year && <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>{paper.year}</span>}
                      </div>
                      <h3 style={{ fontSize: '1em', marginBottom: '0.5rem' }}>{paper.title}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                        {paper.authors?.slice(0, 5).join(', ')}
                        {paper.authors && paper.authors.length > 5 ? ' et al.' : ''}
                      </p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </main>
  )
}
