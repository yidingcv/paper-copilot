#!/usr/bin/env node

/**
 * Fetch CVPR papers from CVF Open Access
 * Primary source: openaccess.thecvf.com/CVPR{year}
 * Usage: node scripts/fetch-cvf.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const cvprDir = path.join(OUTPUT_DIR, 'cvpr');
if (!fs.existsSync(cvprDir)) {
  fs.mkdirSync(cvprDir, { recursive: true });
}

const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025'];

function parseCVFPapers(html, year) {
  const papers = [];
  const paperBlockPattern = /<dt class="ptitle"><br><a href="([^"]+)">([^<]+)<\/a><\/dt>\s*<dd>([\s\S]*?)<dd>\s*\[<a href="([^"]+)">pdf<\/a>]/g;

  let match;
  while ((match = paperBlockPattern.exec(html)) !== null) {
    const detailUrl = match[1];
    const title = match[2].trim();
    const authorBlock = match[3];
    const pdfUrl = match[4];

    const authorPattern = /query_author" value="([^"]+)"/g;
    const authors = [];
    let authorMatch;
    while ((authorMatch = authorPattern.exec(authorBlock)) !== null) {
      authors.push(authorMatch[1]);
    }

    papers.push({
      id: detailUrl.split('/').pop().replace('.html', ''),
      title: title,
      authors: authors,
      year: year.toString(),
      venue: 'cvpr',
      url: `https://openaccess.thecvf.com${detailUrl}`,
      pdfUrl: `https://openaccess.thecvf.com${pdfUrl}`
    });
  }

  return papers;
}

async function fetchCVFPage(url) {
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

async function main() {
  console.log('\n=== Fetching CVPR from CVF Open Access ===\n');

  let totalPapers = 0;

  for (const year of YEARS) {
    console.log(`\n--- CVPR ${year} ---`);

    try {
      const url = `https://openaccess.thecvf.com/CVPR${year}?day=all`;
      console.log(`  Fetching ${url}...`);

      const html = await fetchCVFPage(url);
      const papers = parseCVFPapers(html, year);

      console.log(`  Found ${papers.length} papers`);

      const outputPath = path.join(cvprDir, `cvpr${year}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({ papers }, null, 2), 'utf-8');
      console.log(`  Saved to ${outputPath}`);

      totalPapers += papers.length;

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  console.log(`\n=== Total: ${totalPapers} papers ===`);
  console.log('\n=== Done ===');
}

main().catch(console.error);
