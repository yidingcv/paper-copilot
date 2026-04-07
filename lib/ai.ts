// AI API client using Groq
// Get free API key at https://console.groq.com/keys

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// API key should be stored in api_key.txt (not committed to git)
// or set via environment variable NEXT_PUBLIC_GROQ_API_KEY
function getAPIKey(): string {
  // For client-side, use process.env directly
  const envKey = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_GROQ_API_KEY) as string | undefined
  if (envKey) return envKey
  return ''
}

export interface AIResponse {
  content: string
  error?: string
}

async function callAI(messages: { role: string; content: string }[], retries = 3): Promise<AIResponse> {
  const API_KEY = getAPIKey()
  if (!API_KEY) {
    return {
      content: '',
      error: 'API key not configured. Please add your Groq API key to api_key.txt or set NEXT_PUBLIC_GROQ_API_KEY environment variable'
    }
  }

  for (let i = 0; i < retries; i++) {
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
        const errorMsg = errorData.error?.message || 'API error'

        // Rate limit error - wait and retry
        if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
          await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
          continue
        }
        return { content: '', error: errorMsg }
      }

      const data = await response.json()
      return { content: data.choices[0]?.message?.content || '' }
    } catch (error) {
      if (i === retries - 1) {
        return { content: '', error: 'Network error' }
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return { content: '', error: 'Max retries reached' }
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

  const topPapers = allPapers.slice(0, 50) // Limit for performance

  const result = await callAI([
    {
      role: 'user',
      content: `Given this paper: "${currentPaper.title}"
${currentPaper.abstract ? `Abstract: ${currentPaper.abstract.substring(0, 300)}...` : ''}

Find the most relevant papers from this list (return exactly 3):
${topPapers.map((p, i) => `${i + 1}. "${p.title}" (${p.year || 'N/A'}) ID: ${p.id}`).join('\n')}

IMPORTANT: Return ONLY a valid JSON array with no other text. Format: [{"id": "exact_paper_id_here", "title": "exact_title", "reason": "one sentence why relevant"}]`
    }
  ])

  if (result.error) {
    return { recommendations: [], error: result.error }
  }

  try {
    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = result.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { recommendations: [], error: 'Invalid response format' }
    }
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) {
      return { recommendations: [], error: 'Invalid response format' }
    }
    // Validate and clean recommendations
    const recommendations = parsed.slice(0, 3).map((rec: any) => ({
      id: String(rec.id || ''),
      title: String(rec.title || ''),
      reason: String(rec.reason || '')
    })).filter((rec: any) => rec.id && rec.title)
    return { recommendations }
  } catch (e) {
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
