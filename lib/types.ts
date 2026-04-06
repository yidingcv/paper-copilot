export interface Venue {
  id: string
  name: string
  years?: string[]
  category?: string
}

export interface Paper {
  id: string
  venue: string
  year?: string
  title: string
  authors?: string[]
  abstract?: string
  openReviewUrl?: string
  arxivId?: string
  tags?: string[]
  category?: string
}

export interface ConferencesData {
  venues: Venue[]
  papers: Paper[]
}