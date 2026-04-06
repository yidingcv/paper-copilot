#!/usr/bin/env node

/**
 * Fetch papers from DBLP API
 * - Filters out workshop papers
 * - Only includes: title, authors, year, url
 * - No abstract (not needed)
 */

const fs = require('fs');
const path = require('path');

const VENUES = {
  cvpr: {
    name: 'CVPR',
    queryFormat: 'conf/cvpr/',
    years: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
  },
  iccv: {
    name: 'ICCV',
    queryFormat: 'conf/iccv/',
    years: ['2019', '2021', '2023']
  },
  eccv: {
    name: 'ECCV',
    queryFormat: 'conf/eccv/',
    years: ['2020', '2022', '2024']
  },
  neurips: {
    name: 'NeurIPS',
    queryFormat: 'conf/neurips/',
    years: ['2020', '2021', '2022', '2023', '2024']
  },
  iclr: {
    name: 'ICLR',
    queryFormat: 'conf/iclr/',
    years: ['2020', '2021', '2022', '2023', '2024', '2025']
  },
  icml: {
    name: 'ICML',
    queryFormat: 'conf/icml/',
    years: ['2020', '2021', '2022', '2023', '2024']
  },
  tpami: {
    name: 'TPAMI',
    queryFormat: 'venue:IEEE Trans. Pattern Anal. Mach. Intell year:',
    years: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
  },
};

const BASE_URL = 'https://dblp.org/search/publ/api';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function isWorkshopTitle(title) {
  const workshopKeywords = [
    'workshop',
    'challenge',
    'wkshp',
    'workshop on',
    'first workshop',
    'second workshop',
    'third workshop',
  ];
  const lowerTitle = title.toLowerCase();
  return workshopKeywords.some(kw => lowerTitle.includes(kw));
}

function extractAuthors(authorsData) {
  if (!authorsData) return [];
  const authorList = Array.isArray(authorsData.author) ? authorsData.author : [authorsData.author];
  return authorList.map(a => a.text || a);
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
        return {
          id: info.key || `paper-${Date.now()}-${Math.random()}`,
          title: info.title || '',
          authors: extractAuthors(info.authors),
          year: info.year || '',
          venue: '',
          url: info.url || info.ee || '',
          doi: info.doi || '',
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
    console.log(`    Offset ${offset}: got ${result.papers.length} papers (total: ${result.total})`);

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

    for (const year of venueInfo.years) {
      const papers = await fetchVenueYearPapers(venueId, venueInfo, year);

      // Filter out workshop papers and add venue
      const filteredPapers = papers
        .filter(p => !isWorkshopTitle(p.title))
        .map(p => ({ ...p, venue: venueId }));

      // Save to JSON
      const outputPath = path.join(venueDir, `${venueId}${year}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({ papers: filteredPapers }, null, 2), 'utf-8');
      console.log(`    Saved ${filteredPapers.length} papers (filtered ${papers.length - filteredPapers.length} workshops)`);

      venueTotal += filteredPapers.length;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  ${venueInfo.name} total: ${venueTotal} papers`);
    totalPapers += venueTotal;
  }

  console.log(`\n=== GRAND TOTAL: ${totalPapers} papers ===`);
}

main().catch(console.error);