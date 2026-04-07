'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getRecommendations } from '@/lib/ai'
import type { Paper } from '@/lib/types'

interface AIRecommendationsProps {
  currentPaper: Paper
  allPapers: Paper[]
}

interface Recommendation {
  id: string
  title: string
  reason: string
}

export function AIRecommendations({ currentPaper, allPapers }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [expanded, setExpanded] = useState(false)

  const handleGetRecommendations = async () => {
    setLoading(true)
    setError('')

    const result = await getRecommendations(
      {
        title: currentPaper.title,
        abstract: currentPaper.abstract,
        authors: currentPaper.authors
      },
      allPapers
    )

    if (result.error) {
      setError(result.error)
    } else {
      setRecommendations(result.recommendations)
    }

    setLoading(false)
  }

  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1em', margin: 0 }}>Related Papers</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '0.3em 0.8em',
            borderRadius: '6px',
            border: '1px solid var(--primary)',
            background: expanded ? 'var(--primary)' : 'var(--bg-white)',
            color: expanded ? 'white' : 'var(--primary)',
            cursor: 'pointer',
            fontSize: '0.85em',
          }}
        >
          {loading ? 'Finding...' : expanded ? 'Hide' : '✨ Find Related'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '0.5rem' }}>{error}</p>
      )}

      {expanded && !loading && recommendations.length === 0 && !error && (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: '0.75rem' }}>
            Click &quot;Find Related&quot; to get AI-powered recommendations.
          </p>
          <button
            onClick={handleGetRecommendations}
            style={{
              padding: '0.4em 1em',
              borderRadius: '6px',
              border: '1px solid var(--primary)',
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9em',
            }}
          >
            Find Related Papers
          </button>
        </div>
      )}

      {recommendations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <p style={{ fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.95em' }}>{rec.title}</p>
              <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{rec.reason}</p>
              <Link
                href={`/papers?venue=${currentPaper.venue}&year=${currentPaper.year}&id=${rec.id}`}
                style={{ fontSize: '0.85em', color: 'var(--primary)' }}
              >
                View paper →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
