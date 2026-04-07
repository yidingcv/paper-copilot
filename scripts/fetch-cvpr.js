#!/usr/bin/env node

/**
 * Fetch CVPR papers from DBLP API
 * Usage: node scripts/fetch-cvpr.js
 */

const fs = require('fs');
const path = require('path');

const VENUES = {
  cvpr: {
    name: 'CVPR',
    queryFormat: 'conf/cvpr/',
    years: ['2025']
  },
};

const BASE_URL = 'https://dblp.org/search/publ/api';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Patterns to identify workshop/challenge papers
const CHALLENGE_PATTERNS = [
  /challenge/i,
  /\d+(st|nd|rd|th)\s+challenge/i,
  /challenge\s*[:\-]/i,
  /challenge\s+report/i,
  /challenge\s+survey/i,
  /competition\s+report/i,
  /:\s*methods\s+and\s+results$/i,
  /:\s*methods\s+and\s+results\s+\(/i,
  /(NTIRE|MIPI|PBVS|COQP|P3IV|GigaVision|SemanticSegmentation)\s+\d{4}\s/i,
];

const WORKSHOP_PATTERNS = [
  /workshop/i,
  /\d+(st|nd|rd|th)\s+workshop/i,
  /workshop\s+proceeding/i,
];

function getPaperType(title) {
  for (const pattern of CHALLENGE_PATTERNS) {
    if (pattern.test(title)) return 'challenge';
  }
  for (const pattern of WORKSHOP_PATTERNS) {
    if (pattern.test(title)) return 'workshop';
  }
  return 'paper';
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 503) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      const data = await response.json();
      return data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function fetchPapersPage(query, offset = 0) {
  const url = `${BASE_URL}?q=${encodeURIComponent(query)}&format=json&h=500&r=${offset}`;

  const data = await fetchWithRetry(url);

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
}

async function main() {
  for (const [venueId, venueInfo] of Object.entries(VENUES)) {
    console.log(`\n=== Fetching ${venueInfo.name} ===`);

    const venueDir = path.join(OUTPUT_DIR, venueId);
    if (!fs.existsSync(venueDir)) {
      fs.mkdirSync(venueDir, { recursive: true });
    }

    for (const year of venueInfo.years) {
      const query = venueInfo.queryFormat + year;
      console.log(`  Fetching ${venueId} ${year}...`);

      const allPapers = [];
      let offset = 0;
      let fetchedTotal = 0;

      // Fetch up to 3000 papers (pagination)
      while (offset < 3000) {
        console.log(`    Fetching offset ${offset}...`);
        const result = await fetchPapersPage(query, offset);

        if (result.papers.length === 0) break;

        allPapers.push(...result.papers);
        fetchedTotal = result.total;
        console.log(`    Got ${result.papers.length} papers (total: ${result.total})`);

        if (allPapers.length >= result.total || result.papers.length < 500) {
          break;
        }

        offset += 500;
        await new Promise(r => setTimeout(r, 1000));
      }

      // Deduplicate by title+authors
      const seen = new Set();
      const uniquePapers = allPapers.filter(p => {
        const key = (p.title + '|' + (p.authors || []).join(',')).toLowerCase().substring(0, 200);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const mainPapers = uniquePapers.filter(p => p.type === 'paper');
      const workshops = uniquePapers.filter(p => p.type === 'workshop');
      const challenges = uniquePapers.filter(p => p.type === 'challenge');

      console.log(`    Total fetched: ${allPapers.length}, Unique: ${uniquePapers.length}`);
      console.log(`    Papers: ${mainPapers.length}, Workshops: ${workshops.length}, Challenges: ${challenges.length}`);

      const outputPath = path.join(venueDir, `${venueId}${year}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({ papers: uniquePapers }, null, 2), 'utf-8');
      console.log(`    Saved to ${outputPath}`);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
