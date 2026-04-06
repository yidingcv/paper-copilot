'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'

const VENUE_INFO: Record<string, { name: string; desc: string }> = {
  arxiv: { name: 'arXiv', desc: 'Preprints in cs.AI, cs.LG, cs.CV, cs.CL' },
  neurips: { name: 'NeurIPS', desc: 'Neural Information Processing Systems' },
  iclr: { name: 'ICLR', desc: 'International Conference on Learning Representations' },
  icml: { name: 'ICML', desc: 'International Conference on Machine Learning' },
  cvpr: { name: 'CVPR', desc: 'Computer Vision and Pattern Recognition' },
  iccv: { name: 'ICCV', desc: 'International Conference on Computer Vision' },
  eccv: { name: 'ECCV', desc: 'European Conference on Computer Vision' },
  tpami: { name: 'TPAMI', desc: 'IEEE Transactions on Pattern Analysis and Machine Intelligence' },
  tip: { name: 'TIP', desc: 'IEEE Transactions on Image Processing' },
  tmm: { name: 'TMM', desc: 'IEEE Transactions on Multimedia' },
  ijcv: { name: 'IJCV', desc: 'International Journal of Computer Vision' },
}

interface VenueClientProps {
  venue: string
}

export default function VenueClient({ venue }: VenueClientProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const venueInfo = VENUE_INFO[venue] || { name: venue, desc: '', icon: '📄' }

  const searchArxiv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setLoading(true)

    try {
      const encodedQuery = encodeURIComponent(searchQuery)
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <div className="main">
        <Link href="/conferences" className="back-link">← Back to Conferences</Link>

        <div className="venue-header">
          <h1>{venueInfo.name}</h1>
          <p>{venueInfo.desc}</p>
        </div>

        {venue === 'arxiv' ? (
          <>
            <form onSubmit={searchArxiv} style={{ marginBottom: '2rem' }}>
              <div className="hero-search" style={{ maxWidth: '100%' }}>
                <input
                  type="text"
                  placeholder={`Search ${venueInfo.name} papers...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">Search</button>
              </div>
            </form>

            {loading ? (
              <div className="empty-state"><p>Searching...</p></div>
            ) : papers.length > 0 ? (
              <div className="cards-grid">
                {papers.map((paper) => (
                  <article key={paper.id} className="paper-card">
                    <h3>{paper.title}</h3>
                    <p className="authors">
                      {paper.authors?.slice(0, 3).join(', ')}
                      {paper.authors && paper.authors.length > 3 ? ' et al.' : ''}
                    </p>
                    <p className="abstract">{paper.abstract}</p>
                    <div className="paper-meta">
                      <span className="paper-tag">{paper.year}</span>
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
            ) : (
              <div className="empty-state">
                <p>Search for papers on arXiv using the search box above.</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  Try &quot;transformers&quot;, &quot;diffusion models&quot;, or &quot;reinforcement learning&quot;
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>Conference paper browsing coming soon.</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              For now, use the arXiv search to find related papers.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}