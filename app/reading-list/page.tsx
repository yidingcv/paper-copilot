'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useReadingList } from '@/hooks/useReadingList'
import type { Paper } from '@/lib/types'
import { downloadBibtex } from '@/lib/bibtex'

export default function ReadingListPage() {
  const { readingList, clearReadingList } = useReadingList()
  const [allPapers, setAllPapers] = useState<Paper[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Load all papers to get full details
  useEffect(() => {
    async function loadPapers() {
      const venues = ['cvpr', 'iccv', 'eccv', 'neurips']
      const papers: Paper[] = []

      for (const venue of venues) {
        for (const year of ['2020', '2021', '2022', '2023', '2024', '2025']) {
          try {
            const res = await fetch(`/papercc/paperlists/${venue}/${venue}${year}.json`)
            if (res.ok) {
              const data = await res.json()
              papers.push(...(data.papers || []))
            }
          } catch {
            // ignore
          }
        }
      }

      setAllPapers(papers)
    }

    loadPapers()
  }, [])

  const readingListPapers = readingList
    .map(item => {
      const paper = allPapers.find(p => p.id === item.paperId)
      if (paper) return paper
      // If not found in allPapers, create a minimal one
      return {
        id: item.paperId,
        title: item.title,
        venue: item.venue,
        year: item.year,
        url: '',
        authors: [],
      } as Paper
    })
    .filter(Boolean)

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    setSelectedIds(new Set(readingListPapers.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleExportBibtex = () => {
    const papersToExport = readingListPapers.filter(p => selectedIds.has(p.id))
    if (papersToExport.length > 0) {
      downloadBibtex(papersToExport, 'reading-list.bib')
    }
  }

  return (
    <main>
      <div className="main">
        <Link href="/" className="back-link">← Back to Home</Link>

        <div className="venue-header">
          <h1>Reading List</h1>
          <p>{readingList.length} saved papers</p>
        </div>

        {readingList.length === 0 ? (
          <div className="empty-state">
            <p>No papers saved yet. Click the bookmark icon on any paper to add it here.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={selectAll}
                  style={{
                    padding: '0.4em 1em',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  style={{
                    padding: '0.4em 1em',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-white)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                  }}
                >
                  Clear Selection
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                  {selectedIds.size} selected
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedIds.size > 0 && (
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
                    Export BibTeX ({selectedIds.size})
                  </button>
                )}
                <button
                  onClick={clearReadingList}
                  style={{
                    padding: '0.4em 1em',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: 'var(--bg-white)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="papers-list">
              {readingListPapers.map((paper) => (
                <article
                  key={paper.id}
                  className="paper-item"
                  style={{
                    paddingLeft: selectedIds.has(paper.id) ? '0.5rem' : '1rem',
                    borderLeft: selectedIds.has(paper.id) ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(paper.id)}
                      onChange={() => toggleSelect(paper.id)}
                      style={{ width: '16px', height: '16px', marginTop: '0.25rem', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ padding: '0.2em 0.5em', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '0.75em', fontWeight: 600 }}>
                          {paper.venue.toUpperCase()}
                        </span>
                        {paper.year && <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>{paper.year}</span>}
                      </div>
                      <h3 className="paper-title">{paper.title}</h3>
                      <p className="paper-authors">
                        {paper.authors?.join(', ')}
                      </p>
                      <div className="paper-meta">
                        {paper.url && (
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="paper-link">
                            View Paper →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}