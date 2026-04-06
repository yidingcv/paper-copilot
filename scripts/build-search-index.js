#!/usr/bin/env node

/**
 * Build search index from paper JSON files
 * Creates a compact search index for cross-venue search
 */

const fs = require('fs');
const path = require('path');

const PAPERLISTS_DIR = path.join(__dirname, '..', 'public', 'paperlists');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'search-index.json');

const VENUE_INFO = {
  arxiv: { name: 'arXiv', queryFormat: 'https://export.arxiv.org/api/query?search_query=all:' },
  cvpr: { name: 'CVPR', queryFormat: 'conf/cvpr/' },
  iccv: { name: 'ICCV', queryFormat: 'conf/iccv/' },
  eccv: { name: 'ECCV', queryFormat: 'conf/eccv/' },
  neurips: { name: 'NeurIPS', queryFormat: 'conf/neurips/' },
  iclr: { name: 'ICLR', queryFormat: 'conf/iclr/' },
  icml: { name: 'ICML', queryFormat: 'conf/icml/' },
  tpami: { name: 'TPAMI', queryFormat: 'venue:IEEE Trans. Pattern Anal. Mach. Intell year:' },
  tip: { name: 'TIP', queryFormat: 'venue:IEEE Trans. Image Process year:' },
  tmm: { name: 'TMM', queryFormat: 'venue:IEEE Trans. Multimedia year:' },
  ijcv: { name: 'IJCV', queryFormat: 'venue:Int. J. Comput. Vis year:' },
};

function loadVenueYearFiles(venue) {
  const venueDir = path.join(PAPERLISTS_DIR, venue);
  if (!fs.existsSync(venueDir)) {
    return [];
  }

  const files = fs.readdirSync(venueDir).filter(f => f.endsWith('.json'));
  const allPapers = [];

  for (const file of files) {
    const filePath = path.join(venueDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const papers = data.papers || [];
      // Only include searchable fields to keep index small
      for (const paper of papers) {
        allPapers.push({
          id: paper.id,
          venue: paper.venue || venue,
          year: paper.year,
          title: paper.title,
          authors: paper.authors || [],
        });
      }
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message);
    }
  }

  return allPapers;
}

function buildIndex() {
  console.log('Building search index...');

  const allPapers = [];
  const venues = fs.readdirSync(PAPERLISTS_DIR);

  for (const venue of venues) {
    const venuePath = path.join(PAPERLISTS_DIR, venue);
    if (fs.statSync(venuePath).isDirectory()) {
      const papers = loadVenueYearFiles(venue);
      console.log(`  ${venue}: ${papers.length} papers`);
      allPapers.push(...papers);
    }
  }

  // Create search index structure
  const index = {
    version: 1,
    generated: new Date().toISOString(),
    totalPapers: allPapers.length,
    papers: allPapers,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index), 'utf-8');

  const sizeKB = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1);
  console.log(`\nSearch index built: ${allPapers.length} papers (${sizeKB} KB)`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

buildIndex();
