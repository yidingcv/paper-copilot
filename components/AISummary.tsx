'use client'

import { useState } from 'react'
import { generateSummary } from '@/lib/ai'

interface AISummaryProps {
  abstract?: string
}

export function AISummary({ abstract }: AISummaryProps) {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showOriginal, setShowOriginal] = useState(false)

  const handleGenerate = async () => {
    if (!abstract) return

    setLoading(true)
    setError('')

    const result = await generateSummary(abstract)

    if (result.error) {
      setError(result.error)
    } else {
      setSummary(result.content)
    }

    setLoading(false)
  }

  if (!abstract) return null

  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1em', margin: 0 }}>AI Summary</h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '0.3em 0.8em',
            borderRadius: '6px',
            border: '1px solid var(--primary)',
            background: loading ? 'var(--border)' : 'var(--primary)',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85em',
          }}
        >
          {loading ? 'Generating...' : '✨ Generate Summary'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '0.5rem' }}>{error}</p>
      )}

      {summary && (
        <div>
          <p style={{ lineHeight: 1.6, color: 'var(--text)' }}>{summary}</p>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.85em',
              marginTop: '0.5rem',
              padding: 0,
            }}
          >
            {showOriginal ? 'Hide original abstract' : 'Show original abstract'}
          </button>
          {showOriginal && (
            <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: 'var(--text-muted)', fontSize: '0.9em' }}>
              {abstract}
            </p>
          )}
        </div>
      )}

      {!summary && !error && !loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
          Click &quot;Generate Summary&quot; to get an AI-powered summary of this paper&apos;s abstract.
        </p>
      )}
    </div>
  )
}
