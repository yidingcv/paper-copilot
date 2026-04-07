'use client'

import { useState } from 'react'
import { askQuestion } from '@/lib/ai'
import type { Paper } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatProps {
  paper: Paper
}

export function AIChat({ paper }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setError('')

    const result = await askQuestion(userMessage, {
      title: paper.title,
      abstract: paper.abstract,
      authors: paper.authors
    })

    if (result.error) {
      setError(result.error)
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: result.content }])
    }

    setLoading(false)
  }

  const suggestedQuestions = [
    "What is the main contribution of this paper?",
    "What method does this paper propose?",
    "How does this compare to previous work?",
    "What are the limitations?"
  ]

  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1em', margin: 0 }}>Ask about this paper</h3>
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
          {expanded ? 'Close' : '✨ Ask AI'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.9em', marginBottom: '0.5rem' }}>{error}</p>
      )}

      {expanded && (
        <>
          {messages.length === 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Try these questions:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    style={{
                      padding: '0.3em 0.6em',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.8em',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.9em', lineHeight: 1.5 }}>{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg)' }}>
                <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>Thinking...</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this paper..."
              style={{
                flex: 1,
                padding: '0.6em 1em',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9em',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '0.6em 1em',
                borderRadius: '6px',
                border: '1px solid var(--primary)',
                background: loading ? 'var(--border)' : 'var(--primary)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9em',
              }}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  )
}
