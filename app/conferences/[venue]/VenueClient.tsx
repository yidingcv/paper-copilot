'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'

const VENUE_INFO: Record<string, { name: string; desc: string }> = {
  arxiv: { name: 'arXiv', desc: 'Preprints in cs.AI, cs.LG, cs.CV, cs.CL' },
  cvpr: { name: 'CVPR', desc: 'Computer Vision and Pattern Recognition' },
  iccv: { name: 'ICCV', desc: 'International Conference on Computer Vision' },
  eccv: { name: 'ECCV', desc: 'European Conference on Computer Vision' },
  neurips: { name: 'NeurIPS', desc: 'Neural Information Processing Systems' },
  iclr: { name: 'ICLR', desc: 'International Conference on Learning Representations' },
  icml: { name: 'ICML', desc: 'International Conference on Machine Learning' },
  tpami: { name: 'TPAMI', desc: 'IEEE Transactions on Pattern Analysis and Machine Intelligence' },
  tip: { name: 'TIP', desc: 'IEEE Transactions on Image Processing' },
  tmm: { name: 'TMM', desc: 'IEEE Transactions on Multimedia' },
  ijcv: { name: 'IJCV', desc: 'International Journal of Computer Vision' },
}

const AVAILABLE_YEARS: Record<string, string[]> = {
  cvpr: ['2020', '2021', '2022', '2023', '2024', '2025'],
  iccv: ['2019', '2021', '2023'],
  eccv: ['2020', '2022', '2024'],
  neurips: ['2020', '2021', '2022', '2023', '2024'],
  iclr: ['2020', '2021', '2022'],
  icml: [],
  tpami: [],
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

interface VenueClientProps {
  venue: string
}

export default function VenueClient({ venue }: VenueClientProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [startYear, setStartYear] = useState<string>('')
  const [endYear, setEndYear] = useState<string>('')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const venueInfo = VENUE_INFO[venue] || { name: venue, desc: '' }

  useEffect(() => {
    const years = AVAILABLE_YEARS[venue] || []
    setAvailableYears(years)
    if (years.length > 0) {
      setStartYear(years[0])
      setEndYear(years[years.length - 1])
    }
  }, [venue])

  useEffect(() => {
    setCurrentPage(1)
  }, [startYear, endYear])

  useEffect(() => {
    if (venue === 'arxiv' || availableYears.length === 0) {
      setLoading(false)
      return
    }

    async function fetchPapers() {
      setLoading(true)
      const allPapers: Paper[] = []

      const startIdx = availableYears.indexOf(startYear)
      const endIdx = availableYears.indexOf(endYear)
      if (startIdx === -1 || endIdx === -1) {
        setLoading(false)
        return
      }
      const yearsToFetch = availableYears.slice(startIdx, endIdx + 1)

      try {
        for (const year of yearsToFetch) {
          try {
            const res = await fetch(`/papercc/paperlists/${venue}/${venue}${year}.json`)
            if (res.ok) {
              const data = await res.json()
              allPapers.push(...(data.papers || []))
            }
          } catch (e) {
            console.error(`Error fetching ${venue}${year}:`, e)
          }
        }

        setPapers(allPapers)
      } catch (error) {
        console.error('Error fetching papers:', error)
      } finally {
        setLoading(false)
      }
    }

    if (startYear && endYear) {
      fetchPapers()
    }
  }, [venue, startYear, endYear, availableYears])

  const totalPages = Math.ceil(papers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const displayedPapers = papers.slice(startIndex, endIndex)

  if (venue === 'arxiv') {
    return (
      <main>
        <div className="main">
          <Link href="/" className="back-link">← Back to Home</Link>
          <div className="venue-header">
            <h1>{venueInfo.name}</h1>
            <p>{venueInfo.desc}</p>
          </div>
          <div className="empty-state">
            <p>Use the search box on the home page to search arXiv papers.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className="main">
        <Link href="/" className="back-link">← Back to Home</Link>

        <div className="venue-header">
          <h1>{venueInfo.name}</h1>
          <p>{venueInfo.desc}</p>
        </div>

        {availableYears.length > 0 && (
          <div className="year-filter" style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {availableYears.map(y => (
              <button
                key={y}
                onClick={() => { setStartYear(y); setEndYear(y); }}
                style={{
                  padding: '0.4em 1em',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: startYear === y && endYear === y ? 'var(--primary)' : 'var(--border)',
                  background: startYear === y && endYear === y ? 'var(--primary)' : 'var(--bg-white)',
                  color: startYear === y && endYear === y ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: startYear === y && endYear === y ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><p>Loading papers...</p></div>
        ) : papers.length > 0 ? (
          <>
            <div className="papers-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                  Showing {startIndex + 1}-{Math.min(endIndex, papers.length)} of {papers.length} papers
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ padding: '0.3em 0.6em', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9em' }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="papers-list">
              {displayedPapers.map((paper) => (
                <article key={paper.id} className="paper-item">
                  <h3 className="paper-title">{paper.title}</h3>
                  <p className="paper-authors">
                    {paper.authors?.join(', ')}
                  </p>
                  <div className="paper-meta">
                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="paper-link"
                      >
                        View Paper →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.4em 0.8em',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.4em 0.8em',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ← Prev
                </button>
                <span style={{ color: 'var(--text-muted)', padding: '0 1em' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.4em 0.8em',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.4em 0.8em',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Last
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>No papers found for the selected year range.</p>
          </div>
        )}
      </div>
    </main>
  )
}