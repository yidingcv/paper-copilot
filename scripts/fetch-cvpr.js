#!/usr/bin/env node

/**
 * Fetch CVPR papers from DBLP API and save to JSON
 * Organizes data by venue/year: /paperlists/{venue}/{venue}{year}.json
 * Categorizes papers into: paper, workshop, challenge
 * Usage: node scripts/fetch-cvpr.js
 */

const fs = require('fs');
const path = require('path');

const VENUES = {
  cvpr: {
    name: 'CVPR',
    queryFormat: 'conf/cvpr/',
    years: ['2020', '2021', '2022', '2023', '2024', '2025']
  },
};

const BASE_URL = 'https://dblp.org/search/publ/api';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Determine paper type based on title patterns
function getPaperType(title) {
  const lowerTitle = title.toLowerCase();

  // Challenge patterns
  const challengePatterns = [
    /challenge/i,
    /\d+(st|nd|rd|th)\s+challenge/i,
    /challenge\s*[:\-]/i,
    /challenge\s+on\s+/i,
    /challenge\s+report/i,
    /competition\s+report/i,
    /challenge\s+survey/i,
    /:\s*methods\s+and\s+results$/i, // Common in challenge papers
    /NTIRE\s+\d{4}\s+challenge/i,
    /MIPI\s+\d{4}\s+challenge/i,
    /PBVS\s+\d{4}\s+challenge/i,
  ];

  for (const pattern of challengePatterns) {
    if (pattern.test(title)) {
      return 'challenge';
    }
  }

  // Workshop patterns
  const workshopPatterns = [
    /workshop/i,
    /\d+(st|nd|rd|th)\s+workshop/i,
    /workshop\s+on/i,
    /workshop\s+proceeding/i,
  ];

  for (const pattern of workshopPatterns) {
    if (pattern.test(title)) {
      return 'workshop';
    }
  }

  return 'paper';
}

async function fetchPapersPage(query, offset = 0) {
  const url = `${BASE_URL}?q=${encodeURIComponent(query)}&format=json&h=1000&r=${offset}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result || !data.result.hits || !data.result.hits.hit) {
      return { papers: [], total: 0 };
    }

    const hits = data.result.hits.hit;
    const total = parseInt(data.result.hits['@total']) || hits.length;

    return {
      papers: hits.map(hit => {
        const info = hit.info;
        const title = info.title || '';
        return {
          id: info.key || `paper-${Date.now()}-${Math.random()}`,
          title: title,
          type: getPaperType(title),
          authors: info.authors ? (Array.isArray(info.authors.author) ? info.authors.author.map(a => a.text) : [info.authors.author.text]) : [],
          abstract: info.abstract || '',
          year: info.year || '',
          venue: '',
          url: info.url || info.ee || '',
          doi: info.doi || '',
          pages: info.pages || '',
          volume: info.volume || '',
          number: info.number || '',
        };
      }),
      total
    };
  } catch (error) {
    console.error(`  Error fetching offset ${offset}:`, error.message);
    return { papers: [], total: 0 };
  }
}

async function fetchVenueYearPapers(venueId, venueInfo, year) {
  const query = venueInfo.queryFormat + year;
  console.log(`  Fetching ${venueId} ${year}...`);

  const allPapers = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchPapersPage(query, offset);
    allPapers.push(...result.papers);
    console.log(`    Offset ${offset}: got ${result.papers.length} papers (total available: ${result.total})`);

    if (result.papers.length < 1000 || offset + result.papers.length >= result.total) {
      hasMore = false;
    } else {
      offset += 1000;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return allPapers;
}

async function main() {
  let totalPapers = 0;

  for (const [venueId, venueInfo] of Object.entries(VENUES)) {
    console.log(`\n=== Fetching ${venueInfo.name} ===`);

    // Create venue directory
    const venueDir = path.join(OUTPUT_DIR, venueId);
    if (!fs.existsSync(venueDir)) {
      fs.mkdirSync(venueDir, { recursive: true });
    }

    let venueTotal = 0;
    let paperCount = 0;
    let workshopCount = 0;
    let challengeCount = 0;

    for (const year of venueInfo.years) {
      const papers = await fetchVenueYearPapers(venueId, venueInfo, year);

      // Add venue to each paper
      papers.forEach(p => p.venue = venueId);

      // Count types
      const yearPapers = papers.filter(p => p.type === 'paper').length;
      const yearWorkshops = papers.filter(p => p.type === 'workshop').length;
      const yearChallenges = papers.filter(p => p.type === 'challenge').length;

      paperCount += yearPapers;
      workshopCount += yearWorkshops;
      challengeCount += yearChallenges;

      // Save to JSON
      const outputPath = path.join(venueDir, `${venueId}${year}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({ papers }, null, 2), 'utf-8');
      console.log(`    Saved ${papers.length} papers (${yearPapers} papers, ${yearWorkshops} workshops, ${yearChallenges} challenges)`);

      venueTotal += papers.length;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  ${venueInfo.name} total: ${venueTotal} papers (${paperCount} papers, ${workshopCount} workshops, ${challengeCount} challenges)`);
    totalPapers += venueTotal;
  }

  console.log(`\n=== GRAND TOTAL: ${totalPapers} papers ===`);
}

main().catch(console.error);
