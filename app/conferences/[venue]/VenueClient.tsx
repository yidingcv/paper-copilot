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
  cvpr: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  iccv: ['2019', '2021', '2023'],
  eccv: ['2020', '2022', '2024'],
  neurips: ['2020', '2021', '2022', '2023', '2024'],
  iclr: ['2020', '2021', '2022', '2023', '2024', '2025'],
  icml: ['2020', '2021', '2022', '2023', '2024'],
  tpami: ['2016', '2017', '2018', '2019', '2020', '2022', '2024', '2025'],
}

interface VenueClientProps {
  venue: string
}

export default function VenueClient({ venue }: VenueClientProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [startYear, setStartYear] = useState<string>('')
  const [endYear, setEndYear] = useState<string>('')
  const [availableYears, setAvailableYears] = useState<string[]>([])

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

  if (venue === 'arxiv') {
    return (
      <main>
        <div className="main">
          <Link href="/conferences" className="back-link">← Back to Venues</Link>
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
        <Link href="/conferences" className="back-link">← Back to Venues</Link>

        <div className="venue-header">
          <h1>{venueInfo.name}</h1>
          <p>{venueInfo.desc}</p>
        </div>

        {availableYears.length > 0 && (
          <div className="year-filter" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500 }}>Year Range:</span>
            <select value={startYear} onChange={(e) => setStartYear(e.target.value)} style={{ padding: '0.5em', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9em' }}>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span>to</span>
            <select value={endYear} onChange={(e) => setEndYear(e.target.value)} style={{ padding: '0.5em', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9em' }}>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>({papers.length} papers)</span>
          </div>
        )}

        {loading ? (
          <div className="empty-state"><p>Loading papers...</p></div>
        ) : papers.length > 0 ? (
          <div className="papers-list">
            {papers.map((paper) => (
              <article key={paper.id} className="paper-item">
                <h3 className="paper-title">{paper.title}</h3>
                <p className="paper-authors">
                  {paper.authors?.join(', ')}
                </p>
                <p className="paper-abstract">{paper.abstract || 'No abstract available.'}</p>
                <div className="paper-meta">
                  <span className="paper-tag">{paper.year}</span>
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
        ) : (
          <div className="empty-state">
            <p>No papers found for the selected year range.</p>
          </div>
        )}
      </div>
    </main>
  )
}