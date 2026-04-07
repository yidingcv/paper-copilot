'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Paper } from '@/lib/types'
import { useReadingList } from '@/hooks/useReadingList'
import { AISummary } from '@/components/AISummary'
import { AIRecommendations } from '@/components/AIRecommendations'
import { AIChat } from '@/components/AIChat'

function PaperDetailContent() {
  const searchParams = useSearchParams()
  const venue = searchParams.get('venue') || ''
  const year = searchParams.get('year') || ''
  const paperId = searchParams.get('id') || ''

  const [paper, setPaper] = useState<Paper | null>(null)
  const [allPapers, setAllPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)

  const { isInReadingList, toggleReadingList } = useReadingList()

  useEffect(() => {
    async function loadPapers() {
      if (!venue || !year || !paperId) {
        setLoading(false)
        return
      }

      // Load current paper
      try {
        const res = await fetch(`/papercc/paperlists/${venue}/${venue}${year}.json`)
        if (res.ok) {
          const data = await res.json()
          const found = data.papers?.find((p: Paper) => p.id === paperId)
          setPaper(found || null)
        }
      } catch {
        setPaper(null)
      }

      // Load all papers for recommendations
      const venues = ['cvpr', 'iccv', 'eccv', 'neurips', 'iclr']
      const all: Paper[] = []
      for (const v of venues) {
        for (const y of ['2020', '2021', '2022', '2023', '2024', '2025']) {
          try {
            const r = await fetch(`/papercc/paperlists/${v}/${v}${y}.json`)
            if (r.ok) {
              const d = await r.json()
              all.push(...(d.papers || []))
            }
          } catch {
            // ignore
          }
        }
      }
      setAllPapers(all)
      setLoading(false)
    }

    loadPapers()
  }, [venue, year, paperId])

  if (loading) {
    return (
      <div className="main">
        <div className="empty-state"><p>Loading...</p></div>
      </div>
    )
  }

  if (!paper) {
    return (
      <main>
        <div className="main">
          <Link href="/" className="back-link">← Back to Home</Link>
          <div className="empty-state">
            <p>Paper not found</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main>
      <div className="main">
        <Link href={`/conferences/${venue}`} className="back-link">← Back to {venue.toUpperCase()}</Link>

        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ padding: '0.3em 0.7em', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '0.8em', fontWeight: 600 }}>
              {venue.toUpperCase()} {year}
            </span>
            <button
              onClick={() => toggleReadingList({
                paperId: paper.id,
                venue: venue,
                year: year,
                title: paper.title,
              })}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.3em 0.7em',
                cursor: 'pointer',
                fontSize: '0.85em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3em',
              }}
            >
              {isInReadingList(paper.id) ? '🔖' : '📄'} {isInReadingList(paper.id) ? 'Saved' : 'Save to Reading List'}
            </button>
          </div>

          <h1 style={{ fontSize: '1.8em', marginBottom: '1rem', lineHeight: 1.3 }}>{paper.title}</h1>

          <p style={{ fontSize: '1.1em', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>
            {paper.authors?.join(', ')}
          </p>

          {paper.abstract && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1em', marginBottom: '0.5rem' }}>Abstract</h2>
              <p style={{ lineHeight: 1.7, color: 'var(--text)' }}>{paper.abstract}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '6px',
                  background: 'var(--primary)',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                View Paper →
              </a>
            )}
            {paper.pdfUrl && (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '6px',
                  background: 'var(--bg-white)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                PDF ↓
              </a>
            )}
            {paper.suppUrl && (
              <a
                href={paper.suppUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '6px',
                  background: 'var(--bg-white)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                Supplementary
              </a>
            )}
            {paper.doiUrl && (
              <a
                href={paper.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '6px',
                  background: 'var(--bg-white)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                DOI
              </a>
            )}
          </div>

          {/* AI Features */}
          <AISummary abstract={paper.abstract} />
          <AIRecommendations currentPaper={paper} allPapers={allPapers} />
          <AIChat paper={paper} />

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
              Paper ID: {paper.id}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function PaperDetailPage() {
  return (
    <Suspense fallback={
      <main>
        <div className="main">
          <div className="empty-state"><p>Loading...</p></div>
        </div>
      </main>
    }>
      <PaperDetailContent />
    </Suspense>
  )
}