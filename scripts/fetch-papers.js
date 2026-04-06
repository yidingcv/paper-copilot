#!/usr/bin/env node

/**
 * Fetch papers from DBLP API
 * - Only keeps valid research papers (filters workshops, challenges, editorials, etc.)
 * - Only includes: title, authors, year, url
 */

const fs = require('fs');
const path = require('path');

const VENUES = {
  cvpr: {
    name: 'CVPR',
    queryFormat: 'conf/cvpr/',
    years: ['2020', '2021', '2022', '2023', '2024', '2025']
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
    years: ['2020', '2021', '2022']
  },
};

const BASE_URL = 'https://dblp.org/search/publ/api';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Comprehensive validation to only keep real research papers
 */
function isValidPaper(info) {
  const title = info.title || '';
  const type = info.type || '';
  const authors = info.authors;

  // MUST have authors to be a valid paper
  if (!authors) {
    return false;
  }
  const authorList = Array.isArray(authors.author) ? authors.author : [authors.author];
  if (!authorList || authorList.length === 0) {
    return false;
  }

  // Exclude these types (not real papers)
  const excludeTypes = ['Editorship', 'Editorial', 'Front Matter', 'Preface', 'Journal Articles'];
  if (excludeTypes.some(t => type.includes(t))) {
    return false;
  }

  // Title length checks
  if (title.length < 15 || title.length > 300) {
    return false;
  }

  // Must have lowercase letters (real text)
  if (!/[a-z]/.test(title)) {
    return false;
  }

  const lowerTitle = title.toLowerCase();

  // Exclude patterns - comprehensive list
  const excludePatterns = [
    // Workshop/Challenge/Competition keywords at start
    /^workshop/i,
    /^challenge/i,
    /^competition/i,

    // Workshop/Challenge/Competition keywords at end
    /workshop$/i,
    /challenge$/i,
    /competition$/i,

    // "at X Year" pattern (e.g., "Traffic4cast at NeurIPS 2020")
    /\s+at\s+(neurips|cvpr|iccv|eccv|icml|iclr)\s+\d{4}/i,

    // Conference year + workshop/challenge/competition
    /(neurips|cvpr|iccv|eccv|icml|iclr)\s+\d{4}\s+(workshop|challenge|competition|invited|overview|proceeding)/i,

    // Proceedings patterns
    /^proceedings/i,
    /proceedings\s+of/i,

    // "Advances in NIPS/NeurIPS" (book style)
    /^advances\s+in\s+(neural\s+information\s+processing\s+systems|nips|neurips)/i,

    // International conference patterns (usually overview papers)
    /^international\s+conference/i,

    // Results and insights
    /^results\s+and\s+insights/i,

    // Patterns with year in title indicating non-paper content
    /^(the\s+)?\d{4}\s+(workshop|challenge|conference)/i,

    // "Foreword", "Preface", "Introduction"
    /foreword/i,
    /preface/i,
    /^introduction\s+to/i,

    // Common workshop/challenge phrases
    /challenge\s+report/i,
    /competition\s+report/i,
    /workshop\s+summary/i,
    /workshop\s+proceedings/i,

    // "Unreasonable effectiveness" type titles
    /yet\s+more/i,
    /unreasonable\s+effectiveness/i,

    // Survey papers (sometimes ok, but often excluded)
    /survey\s+paper/i,
    /survey\s+of/i,
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(title)) {
      return false;
    }
  }

  // Additional check: if title looks like a conference announcement (has month/date range)
  // e.g., "June 19-25, 2021" or "December 6-12, 2020"
  if (/[A-Z][a-z]+\s+\d+-\d+,\s+\d{4}/.test(title)) {
    return false;
  }

  // Title starts with conference name (likely not a paper)
  if (/^(cvpr|iccv|eccv|neurips|nips|icml|iclr)\s+\d{4}/i.test(title)) {
    return false;
  }

  // Contains conference info like "CVPR 2024" or "NeurIPS 2020" right after a major phrase
  // Pattern: "IEEE/CVF Conference ... CVPR 2024"
  if (/(IEEE\/CVF|Conference|Proceedings).*(CVPR|NeurIPS|ICCV|ECCV)\s+\d{4}/i.test(title)) {
    return false;
  }

  // If title is mostly uppercase (common for conference info)
  if (title === title.toUpperCase() && title.length > 30) {
    return false;
  }

  return true;
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

      // Filter to only valid papers
      const filteredPapers = papers
        .filter(p => isValidPaper(p))
        .map(p => ({ ...p, venue: venueId }));

      // Save to JSON
      const outputPath = path.join(venueDir, `${venueId}${year}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({ papers: filteredPapers }, null, 2), 'utf-8');
      console.log(`    Saved ${filteredPapers.length} papers (filtered ${papers.length - filteredPapers.length})`);

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