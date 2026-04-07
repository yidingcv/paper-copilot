#!/usr/bin/env node

/**
 * Fetch NeurIPS papers from official proceedings
 * Years: 2020, 2021, 2022, 2023, 2024
 * Primary source: https://proceedings.neurips.cc/paper/{year}
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists', 'neurips');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const YEARS = ['2020', '2021', '2022', '2023', '2024'];
const CONCURRENCY = 50;
const DELAY_BETWEEN_BATCHES = 100;

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
  // NeurIPS 2022-2024: -Abstract-Conference.html or -Abstract-Datasets_and_Benchmarks_Track.html
  // NeurIPS 2020-2021: -Abstract.html
  let pattern;
  if (year === '2020' || year === '2021') {
    pattern = new RegExp(`href="(/paper_files/paper/${year}/hash/[^"]+-Abstract\\.html)"`, 'g');
  } else {
    pattern = new RegExp(`href="(/paper_files/paper/${year}/hash/[^"]+-Abstract[^"]*\\.html)"`, 'g');
  }

  const links = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

function parsePaperPage(html, url, year) {
  // Extract from meta tags
  const titleMatch = html.match(/<meta name="citation_title" content="([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : '';

  const authorMatches = html.matchAll(/<meta name="citation_author" content="([^"]+)"/g);
  const authors = [...authorMatches].map(m => m[1]);

  const doiMatch = html.match(/<meta name="citation_doi" content="([^"]+)"/);
  const doiUrl = doiMatch ? `https://doi.org/${doiMatch[1]}` : null;

  const pdfMatch = html.match(/<meta name="citation_pdf_url" content="([^"]+)"/);
  const pdfUrl = pdfMatch ? pdfMatch[1] : null;

  // Abstract
  const abstractMatch = html.match(/<p class="paper-abstract">([\s\S]*?)<\/p>/);
  let abstract = abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  // Generate ID
  const idMatch = url.match(/\/hash\/([^.]+)/);
  const id = idMatch ? `neurips${year}_${idMatch[1]}` : `neurips${year}_${Date.now()}`;

  // Determine track from URL or content
  let track = 'main';
  if (url.includes('Datasets_and_Benchmarks')) {
    track = 'datasets_and_benchmarks';
  } else if (url.includes('Workshop')) {
    track = 'workshop';
  }

  return {
    id: id,
    title: title,
    authors: authors,
    abstract: abstract,
    year: year,
    venue: 'neurips',
    url: `https://proceedings.neurips.cc${url}`,
    pdfUrl: pdfUrl,
    doiUrl: doiUrl,
    track: track
  };
}

async function fetchBatch(papers, year) {
  const results = await Promise.all(
    papers.map(async (link) => {
      try {
        const paperUrl = `https://proceedings.neurips.cc${link}`;
        const paperHtml = await fetchPage(paperUrl);
        return parsePaperPage(paperHtml, link, year);
      } catch (e) {
        return null;
      }
    })
  );
  return results.filter(r => r !== null && r.title);
}

async function fetchYearPapers(year) {
  console.log(`\n--- NeurIPS ${year} ---`);

  const mainHtml = await fetchPage(`https://proceedings.neurips.cc/paper/${year}`);
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
  console.log('\n=== Fetching NeurIPS from Official Proceedings ===\n');

  let totalPapers = 0;

  for (const year of YEARS) {
    try {
      const papers = await fetchYearPapers(year);
      if (papers.length > 0) {
        const outputPath = path.join(OUTPUT_DIR, `neurips${year}.json`);
        fs.writeFileSync(outputPath, JSON.stringify({ papers }, null, 2));
        console.log(`  Saved ${papers.length} papers to neurips${year}.json`);
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