'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'

interface SearchPaper {
  id: string
  venue: string
  year?: string
  title: string
  authors: string[]
}

interface SearchResult {
  papers: SearchPaper[]
  total: number
}

const VENUE_NAMES: Record<string, string> = {
  arxiv: 'arXiv',
  cvpr: 'CVPR',
  iccv: 'ICCV',
  eccv: 'ECCV',
  neurips: 'NeurIPS',
  iclr: 'ICLR',
  icml: 'ICML',
  tpami: 'TPAMI',
  tip: 'TIP',
  tmm: 'TMM',
  ijcv: 'IJCV',
}

export default function SearchOverlay() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ papers: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [indexLoaded, setIndexLoaded] = useState(false)
  const [allPapers, setAllPapers] = useState<SearchPaper[]>([])

  // Load search index on first search attempt
  useEffect(() => {
    if (query.length >= 2 && !indexLoaded) {
      setLoading(true)
      fetch('/papercc/search-index.json')
        .then(res => res.json())
        .then(data => {
          setAllPapers(data.papers || [])
          setIndexLoaded(true)
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to load search index:', err)
          setLoading(false)
        })
    }
  }, [query, indexLoaded])

  // Perform search when query or index changes
  useEffect(() => {
    if (query.length < 2 || !indexLoaded) {
      setResults({ papers: [], total: 0 })
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = allPapers.filter(paper => {
      const titleMatch = paper.title.toLowerCase().includes(lowerQuery)
      const authorMatch = paper.authors?.some(a => a.toLowerCase().includes(lowerQuery))
      return titleMatch || authorMatch
    })

    setResults({
      papers: filtered.slice(0, 100), // Limit to first 100 results
      total: filtered.length,
    })
  }, [query, indexLoaded, allPapers])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all conferences and journals..."
          style={{
            flex: 1,
            padding: '0.75em 1em',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '1em',
            maxWidth: '400px',
          }}
        />
      </form>

      {loading && (
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5em' }}>Loading search index...</p>
      )}

      {query.length >= 2 && !loading && (
        <div style={{ marginTop: '1rem' }}>
          {results.total > 0 && (
            <p style={{ color: 'var(--text-muted)', marginBottom: '1em', fontSize: '0.9em' }}>
              Found {results.total} papers. Showing top {results.papers.length} results.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '800px' }}>
            {results.papers.map((paper) => (
              <article
                key={paper.id}
                style={{
                  padding: '1em',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-white)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      padding: '0.2em 0.5em',
                      borderRadius: '4px',
                      background: 'var(--primary)',
                      color: 'white',
                      fontSize: '0.75em',
                      fontWeight: 600,
                    }}
                  >
                    {VENUE_NAMES[paper.venue] || paper.venue}
                  </span>
                  {paper.year && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
                      {paper.year}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1em', marginBottom: '0.5rem' }}>{paper.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                  {paper.authors?.slice(0, 5).join(', ')}
                  {paper.authors && paper.authors.length > 5 ? ' et al.' : ''}
                </p>
              </article>
            ))}
          </div>

          {results.total === 0 && !loading && (
            <p style={{ color: 'var(--text-muted)' }}>No papers found. Try a different search term.</p>
          )}
        </div>
      )}
    </div>
  )
}
