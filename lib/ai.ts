// AI API client using Groq
// Get free API key at https://console.groq.com/keys

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// API key should be stored in api_key.txt (not committed to git)
// or set via environment variable NEXT_PUBLIC_GROQ_API_KEY
function getAPIKey(): string {
  // Try environment variable first
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    return process.env.NEXT_PUBLIC_GROQ_API_KEY
  }
  // Try reading from api_key.txt
  try {
    const fs = require('fs')
    const path = require('path')
    const keyFile = path.join(__dirname, '..', 'api_key.txt')
    if (fs.existsSync(keyFile)) {
      return fs.readFileSync(keyFile, 'utf8').trim()
    }
  } catch {
    // ignore
  }
  return ''
}

export interface AIResponse {
  content: string
  error?: string
}

async function callAI(messages: { role: string; content: string }[]): Promise<AIResponse> {
  const API_KEY = getAPIKey()
  if (!API_KEY) {
    return {
      content: '',
      error: 'API key not configured. Please add your Groq API key to api_key.txt or set NEXT_PUBLIC_GROQ_API_KEY environment variable'
    }
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { content: '', error: errorData.error?.message || 'API error' }
    }

    const data = await response.json()
    return { content: data.choices[0]?.message?.content || '' }
  } catch (error) {
    return { content: '', error: 'Network error' }
  }
}

export async function generateSummary(text: string): Promise<AIResponse> {
  if (!text || text.length < 50) {
    return { content: text, error: '' }
  }

  return callAI([
    {
      role: 'user',
      content: `Summarize this research paper abstract in 2-3 concise sentences:\n\n${text}`
    }
  ])
}

export async function getRecommendations(
  currentPaper: { title: string; abstract?: string; authors?: string[] },
  allPapers: { id: string; title: string; abstract?: string; authors?: string[]; year?: string; venue?: string }[]
): Promise<{ recommendations: { id: string; title: string; reason: string }[]; error?: string }> {
  if (!currentPaper.title) return { recommendations: [] }

  const topPapers = allPapers.slice(0, 100) // Limit for performance

  const result = await callAI([
    {
      role: 'user',
      content: `Given this paper: "${currentPaper.title}"
${currentPaper.abstract ? `Abstract: ${currentPaper.abstract.substring(0, 500)}...` : ''}

Find the most relevant papers from this list (return top 3):
${topPapers.map((p, i) => `${i + 1}. "${p.title}" ${p.year || ''}`).join('\n')}

Return ONLY a JSON array like: [{"id": "paper_id", "title": "Paper Title", "reason": "Why it's relevant"}]`
    }
  ])

  if (result.error) {
    return { recommendations: [], error: result.error }
  }

  try {
    const parsed = JSON.parse(result.content)
    return { recommendations: Array.isArray(parsed) ? parsed : [] }
  } catch {
    return { recommendations: [], error: 'Failed to parse recommendations' }
  }
}

export async function askQuestion(
  question: string,
  context: { title: string; abstract?: string; authors?: string[] }
): Promise<AIResponse> {
  return callAI([
    {
      role: 'system',
      content: `You are a helpful research assistant. You are discussing the paper: "${context.title}"
${context.abstract ? `Paper abstract: ${context.abstract}` : ''}
${context.authors ? `Authors: ${context.authors.join(', ')}` : ''}

Provide clear, helpful answers about this paper.`
    },
    {
      role: 'user',
      content: question
    }
  ])
}
