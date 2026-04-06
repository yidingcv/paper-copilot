'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Paper, Venue } from '@/lib/types'

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
  const [allPapers, setAllPapers] = useState<Paper[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [startYear, setStartYear] = useState<string>('')
  const [endYear, setEndYear] = useState<string>('')
  const [availableYears, setAvailableYears] = useState<string[]>([])

  const venueInfo = VENUE_INFO[venue] || { name: venue, desc: '' }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [papersRes, venuesRes] = await Promise.all([
          fetch('/data/papers.json'),
          fetch('/data/venues.json')
        ])

        const papersData = await papersRes.json()
        const venuesData = await venuesRes.json()

        setAllPapers(papersData.papers || [])
        setVenues(venuesData.venues || [])

        const venueData = venuesData.venues?.find((v: Venue) => v.id === venue)
        if (venueData?.years) {
          const years = [...venueData.years].sort()
          setAvailableYears(years)
          setStartYear(years[0] || '')
          setEndYear(years[years.length - 1] || '')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [venue])

  useEffect(() => {
    if (!startYear || !endYear) {
      setPapers(allPapers.filter(p => p.venue === venue))
      return
    }

    const filtered = allPapers.filter(p => {
      if (p.venue !== venue) return false
      const year = parseInt(p.year || '0')
      return year >= parseInt(startYear) && year <= parseInt(endYear)
    })
    setPapers(filtered)
  }, [startYear, endYear, allPapers, venue])

  if (loading) {
    return (
      <main>
        <div className="main">
          <Link href="/conferences" className="back-link">← Back to Venues</Link>
          <div className="empty-state"><p>Loading...</p></div>
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

        {venue === 'arxiv' ? (
          <div className="empty-state">
            <p>Use the search box on the home page to search arXiv papers.</p>
          </div>
        ) : (
          <>
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

            {papers.length > 0 ? (
              <div className="papers-list">
                {papers.map((paper) => (
                  <article key={paper.id} className="paper-item">
                    <h3 className="paper-title">{paper.title}</h3>
                    <p className="paper-authors">
                      {paper.authors?.join(', ')}
                    </p>
                    <p className="paper-abstract">{paper.abstract}</p>
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
          </>
        )}
      </div>
    </main>
  )
}