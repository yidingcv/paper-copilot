'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Paper } from '@/lib/types'
import { downloadBibtex } from '@/lib/bibtex'
import { useReadingList } from '@/hooks/useReadingList'

const VENUE_INFO: Record<string, { name: string; desc: string }> = {
  arxiv: { name: 'arXiv', desc: 'Preprints in cs.AI, cs.LG, cs.CV, cs.CL' },
  cvpr: { name: 'CVPR', desc: 'Computer Vision and Pattern Recognition' },
  iccv: { name: 'ICCV', desc: 'International Conference on Computer Vision' },
  eccv: { name: 'ECCV', desc: 'European Conference on Computer Vision' },
  neurips: { name: 'NeurIPS', desc: 'Neural Information Processing Systems' },
  iclr: { name: 'ICLR', desc: 'International Conference on Learning Representations' },
  icml: { name: 'ICML', desc: 'International Conference on Machine Learning' },
  iros: { name: 'IROS', desc: 'Intelligent Robots and Systems' },
  icra: { name: 'ICRA', desc: 'International Conference on Robotics and Automation' },
  aaai: { name: 'AAAI', desc: 'Association for the Advancement of Artificial Intelligence' },
  tpami: { name: 'TPAMI', desc: 'IEEE Transactions on Pattern Analysis and Machine Intelligence' },
  tip: { name: 'TIP', desc: 'IEEE Transactions on Image Processing' },
  tmm: { name: 'TMM', desc: 'IEEE Transactions on Multimedia' },
  ijcv: { name: 'IJCV', desc: 'International Journal of Computer Vision' },
  tnnls: { name: 'TNNLS', desc: 'IEEE Transactions on Neural Networks and Learning Systems' },
  tcsvt: { name: 'TCSVT', desc: 'IEEE Transactions on Circuits and Systems for Video Technology' },
}

const AVAILABLE_YEARS: Record<string, string[]> = {
  cvpr: ['2020', '2021', '2022', '2023', '2024', '2025'],
  iccv: ['2019', '2021', '2023', '2025'],
  eccv: ['2020', '2022', '2024'],
  neurips: ['2020', '2021', '2022', '2023', '2024'],
  iclr: ['2020', '2021', '2022'],
  icml: [],
  iros: ['2020', '2021', '2022', '2023', '2024'],
  icra: ['2020', '2021', '2022', '2023', '2024'],
  aaai: ['2020', '2021', '2022', '2023', '2024', '2025'],
  tpami: [],
  tip: [],
  tmm: [],
  ijcv: [],
  tnnls: [],
  tcsvt: [],
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
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const togglePaperSelection = (paperId: string) => {
    const newSelected = new Set(selectedPapers)
    if (newSelected.has(paperId)) {
      newSelected.delete(paperId)
    } else {
      newSelected.add(paperId)
    }
    setSelectedPapers(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedPapers.size === displayedPapers.length) {
      setSelectedPapers(new Set())
    } else {
      setSelectedPapers(new Set(displayedPapers.map(p => p.id)))
    }
  }

  const handleExportBibtex = () => {
    const papersToExport = papers.filter(p => selectedPapers.has(p.id))
    if (papersToExport.length > 0) {
      downloadBibtex(papersToExport, `${venue}-papers.bib`)
    }
  }

  const { readingList, toggleReadingList, isInReadingList } = useReadingList()

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
    setSelectedPapers(new Set())
  }, [startYear, endYear, searchQuery])

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

  // Filter papers by search query
  const filteredPapers = papers.filter(p => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const titleMatch = p.title?.toLowerCase().includes(query)
      const authorMatch = p.authors?.some(a => a.toLowerCase().includes(query))
      return titleMatch || authorMatch
    }
    return true
  })

  const totalPages = Math.ceil(filteredPapers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const displayedPapers = filteredPapers.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

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
          <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
            <input
              type="text"
              placeholder={`Search ${venueInfo.name} papers by title or author...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0.6em 1em',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.95em',
              }}
            />
          </div>
        )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={selectedPapers.size === displayedPapers.length && displayedPapers.length > 0 && displayedPapers.every(p => selectedPapers.has(p.id))}
                  onChange={toggleSelectAll}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  title="Select all on this page"
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                  {searchQuery ? 'Found ' : 'Showing '}
                  {filteredPapers.length} {searchQuery ? 'papers' : `of ${papers.length} papers`}
                  {searchQuery && ` (filtered from ${papers.length})`}
                </span>
                {selectedPapers.size > 0 && (
                  <span style={{ color: 'var(--primary)', fontSize: '0.9em', fontWeight: 500 }}>
                    ({selectedPapers.size} selected)
                  </span>
                )}
                {selectedPapers.size > 0 && (
                  <button
                    onClick={() => setSelectedPapers(new Set())}
                    style={{
                      padding: '0.2em 0.6em',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-white)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8em',
                    }}
                    title="Clear all selections"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setSelectedPapers(new Set(filteredPapers.map(p => p.id)))}
                  style={{
                    padding: '0.2em 0.6em',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8em',
                  }}
                  title="Select all filtered papers"
                >
                  Select All
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedPapers.size > 0 && (
                  <button
                    onClick={handleExportBibtex}
                    style={{
                      padding: '0.4em 1em',
                      borderRadius: '6px',
                      border: '1px solid var(--primary)',
                      background: 'var(--primary)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.9em',
                    }}
                  >
                    Export BibTeX ({selectedPapers.size})
                  </button>
                )}
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
                <article key={paper.id} className="paper-item" style={{ paddingLeft: selectedPapers.has(paper.id) ? '0.5rem' : '1rem', borderLeft: selectedPapers.has(paper.id) ? '3px solid var(--primary)' : '3px solid transparent', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedPapers.has(paper.id)}
                      onChange={() => togglePaperSelection(paper.id)}
                      style={{ width: '16px', height: '16px', marginTop: '0.25rem', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Link
                          href={`/papers?venue=${venue}&year=${paper.year}&id=${paper.id}`}
                          style={{ flex: 1, textDecoration: 'none' }}
                        >
                          <h3 className="paper-title" style={{ cursor: 'pointer' }}>{paper.title}</h3>
                        </Link>
                        <button
                          onClick={() => toggleReadingList({
                            paperId: paper.id,
                            venue: venue,
                            year: paper.year || '',
                            title: paper.title,
                          })}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2em',
                            padding: '0.2em',
                            opacity: isInReadingList(paper.id) ? 1 : 0.5,
                          }}
                          title={isInReadingList(paper.id) ? 'Remove from reading list' : 'Add to reading list'}
                        >
                          {isInReadingList(paper.id) ? '🔖' : '📄'}
                        </button>
                      </div>
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
                    </div>
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
            <p>{searchQuery ? 'No papers match your search.' : 'No papers found for the selected year range.'}</p>
          </div>
        )}
      </div>
    </main>
  )
}