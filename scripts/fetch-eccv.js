#!/usr/bin/env node

/**
 * Fetch ECCV papers from ECVA official page
 * Years: 2020, 2022, 2024
 * Primary source: https://www.ecva.net/papers.php
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists', 'eccv');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const YEARS = ['2020', '2022', '2024'];
const CONCURRENCY = 10; // Parallel requests
const DELAY_BETWEEN_BATCHES = 500;

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function parsePaperLinks(html, year) {
  const pattern = new RegExp(`href=(papers/eccv_${year}/papers_ECCV/html/\\d+_ECCV_${year}_paper\\.php)`, 'g');
  const links = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

function parsePaperPage(html, url, year) {
  // Title
  const titleMatch = html.match(/<div id="papertitle">\s*([^<]+)/);
  if (!titleMatch) return null;
  const title = titleMatch[1].trim();

  // Authors
  const authorsMatch = html.match(/<div id="authors">[\s\S]*?<b><i>([\s\S]*?)<\/i><\/b>/);
  const authorsRaw = authorsMatch ? authorsMatch[1] : '';
  const authors = authorsRaw
    .split(/,|;/)
    .map(a => a.replace(/\*/g, '').replace(/\s+/g, ' ').trim())
    .filter(a => a.length > 0 && a.length < 100);

  // PDF
  let pdfUrl = null;
  const pdfMatch = html.match(/href=(https:\/\/www\.ecva\.net\/[^>'"]+\.pdf)/);
  if (pdfMatch) {
    pdfUrl = pdfMatch[1];
  } else {
    const pdfRelMatch = html.match(/href=(\.\.\/\.\.\/\.\.\/\.\.\/papers\/[^>'"]+\.pdf)/);
    if (pdfRelMatch) pdfUrl = 'https://www.ecva.net/' + pdfRelMatch[1];
  }

  // Supplementary
  let suppUrl = null;
  const suppMatch = html.match(/href='([^']+supp\.pdf)'/);
  if (suppMatch) {
    suppUrl = suppMatch[1].startsWith('http') ? suppMatch[1] : 'https://www.ecva.net/' + suppMatch[1];
  }

  // DOI
  const doiMatch = html.match(/href="(https:\/\/link\.springer\.com\/chapter\/[^"]+)"/);
  const doiUrl = doiMatch ? doiMatch[1] : null;

  // ID
  const idMatch = url.match(/(\d+)_ECCV/);
  const id = idMatch ? `eccv${year}_${idMatch[1]}` : `eccv${year}_${Date.now()}`;

  return {
    id: id,
    title: title,
    authors: authors,
    year: year,
    venue: 'eccv',
    url: url,
    pdfUrl: pdfUrl,
    suppUrl: suppUrl,
    doiUrl: doiUrl
  };
}

async function fetchBatch(papers, year) {
  const results = await Promise.all(
    papers.map(async (link) => {
      try {
        const paperUrl = `https://www.ecva.net/${link}`;
        const paperHtml = await fetchPage(paperUrl);
        return parsePaperPage(paperHtml, paperUrl, year);
      } catch (e) {
        return null;
      }
    })
  );
  return results.filter(r => r !== null);
}

async function fetchYearPapers(year) {
  console.log(`\n--- ECCV ${year} ---`);

  const mainHtml = await fetchPage('https://www.ecva.net/papers.php');
  const paperLinks = parsePaperLinks(mainHtml, year);
  console.log(`  Found ${paperLinks.length} paper links`);

  if (paperLinks.length === 0) return [];

  const allPapers = [];
  const totalBatches = Math.ceil(paperLinks.length / CONCURRENCY);

  for (let i = 0; i < paperLinks.length; i += CONCURRENCY) {
    const batch = paperLinks.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    console.log(`  Batch ${batchNum}/${totalBatches} (${allPapers.length} papers so far)...`);

    const results = await fetchBatch(batch, year);
    allPapers.push(...results);

    if (i + CONCURRENCY < paperLinks.length) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = allPapers.filter(p => {
    const key = p.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  ${unique.length} unique papers`);
  return unique;
}

async function main() {
  console.log('\n=== Fetching ECCV from ECVA ===\n');

  let totalPapers = 0;

  for (const year of YEARS) {
    try {
      const papers = await fetchYearPapers(year);
      if (papers.length > 0) {
        const outputPath = path.join(OUTPUT_DIR, `eccv${year}.json`);
        fs.writeFileSync(outputPath, JSON.stringify({ papers }, null, 2));
        console.log(`  Saved ${papers.length} papers to eccv${year}.json`);
        totalPapers += papers.length;
      }
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }

    if (year !== YEARS[YEARS.length - 1]) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== Total: ${totalPapers} papers ===`);
}

main().catch(console.error);