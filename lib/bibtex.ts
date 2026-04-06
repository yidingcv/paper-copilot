import type { Paper } from './types'

/**
 * Convert a paper to BibTeX format
 */
export function paperToBibtex(paper: Paper): string {
  const key = paper.id.replace(/[^a-zA-Z0-9]/g, '')
  const authors = paper.authors?.join(' and ') || ''
  const year = paper.year || ''
  const title = paper.title || ''
  const url = paper.url || ''

  let bibtex = `@inproceedings{${key},\n`
  bibtex += `  author={${authors}},\n`
  bibtex += `  title={{${title}}},\n`
  if (year) bibtex += `  year={${year}},\n`
  if (url) bibtex += `  url={${url}},\n`
  bibtex += `}`

  return bibtex
}

/**
 * Download papers as a BibTeX file
 */
export function downloadBibtex(papers: Paper[], filename = 'papers.bib'): void {
  const bib = papers.map(paperToBibtex).join('\n\n')
  const blob = new Blob([bib], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
