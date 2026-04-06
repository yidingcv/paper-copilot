#!/usr/bin/env node

/**
 * Fetch papers from DBLP API and save to JSON
 * Usage: node scripts/fetch-dblp.js
 */

const fs = require('fs');
const path = require('path');

const VENUES = {
  // CVPR: 2016-2025 (10 years)
  cvpr: {
    name: 'CVPR',
    query: 'venue:CVPR',
    years: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
  },
  // TPAMI: 2015-2025
  tpami: {
    name: 'TPAMI',
    query: 'venue:IEEE Trans. Pattern Anal. Mach. Intell',
    years: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
  },
};

const BASE_URL = 'https://dblp.org/search/publ/api';

async function fetchVenuePapers(venueId, venueInfo, year) {
  // For CVPR, use conf/cvpr format; for TPAMI use venue filter
  let query;
  if (venueId === 'cvpr') {
    query = `conf/cvpr/${year}`;
  } else {
    query = `${venueInfo.query} year:${year}`;
  }

  const url = `${BASE_URL}?q=${encodeURIComponent(query)}&format=json&h=100&r=200`;

  console.log(`Fetching ${venueId} ${year}...`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !data.result.hits || !data.result.hits.hit) {
      console.log(`  No results for ${venueId} ${year}`);
      return [];
    }

    const hits = data.result.hits.hit;
    console.log(`  Found ${hits.length} papers`);

    return hits.map(hit => {
      const info = hit.info;
      return {
        id: info.url ? info.url.split('/').pop() : `paper-${Date.now()}-${Math.random()}`,
        title: info.title || '',
        authors: info.authors ? (Array.isArray(info.authors.author) ? info.authors.author.map(a => a.text) : [info.authors.author.text]) : [],
        abstract: info.abstract || '',
        year: year,
        venue: venueId,
        url: info.url || '',
        doi: info.doi || '',
        pages: info.pages || '',
        volume: info.volume || '',
        number: info.number || '',
        journal: info.journal || '',
        conference: info.conference || '',
      };
    });
  } catch (error) {
    console.error(`  Error fetching ${venueId} ${year}:`, error.message);
    return [];
  }
}

async function main() {
  const allPapers = [];

  for (const [venueId, venueInfo] of Object.entries(VENUES)) {
    console.log(`\n=== Fetching ${venueInfo.name} ===`);
    for (const year of venueInfo.years) {
      const papers = await fetchVenuePapers(venueId, venueInfo, year);
      allPapers.push(...papers);

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Remove duplicates by title
  const uniquePapers = [];
  const seenTitles = new Set();
  for (const paper of allPapers) {
    const titleKey = paper.title.toLowerCase().trim();
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      uniquePapers.push(paper);
    }
  }

  // Sort by year descending, then by title
  uniquePapers.sort((a, b) => {
    if (b.year !== a.year) return b.year.localeCompare(a.year);
    return a.title.localeCompare(b.title);
  });

  console.log(`\n=== Total: ${uniquePapers.length} unique papers ===`);

  // Save to JSON
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'papers.json');
  const output = { papers: uniquePapers };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Saved to ${outputPath}`);
}

main().catch(console.error);