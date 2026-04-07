#!/usr/bin/env node

/**
 * Fetch ICCV papers from CVF Open Access
 * Handles both ?day=all and day-based URL formats
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists', 'iccv');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const YEARS = ['2019', '2021', '2023', '2025'];

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

function parsePapers(html, year) {
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

    let suppUrl = null;
    let arxivUrl = null;

    const suppMatch = authorBlock.match(/href="([^"]+)">supp<\/a>/);
    if (suppMatch) suppUrl = suppMatch[1];

    const arxivMatch = authorBlock.match(/href="(http:\/\/arxiv\.org\/abs\/[^"]+)">arXiv<\/a>/);
    if (arxivMatch) arxivUrl = arxivMatch[1];

    papers.push({
      id: detailUrl.split('/').pop().replace('.html', ''),
      title: title,
      authors: authors,
      year: year,
      venue: 'iccv',
      url: `https://openaccess.thecvf.com${detailUrl}`,
      pdfUrl: `https://openaccess.thecvf.com${pdfUrl}`,
      suppUrl: suppUrl ? `https://openaccess.thecvf.com${suppUrl}` : null,
      arxivUrl: arxivUrl
    });
  }

  return papers;
}

function parseDayLinks(html, year) {
  const dayPattern = new RegExp(`href="(ICCV${year}\\.py\\?day=\\d{4}-\\d{2}-\\d{2})">([^<]+)<\/a>`, 'g');
  const days = [];
  let match;
  while ((match = dayPattern.exec(html)) !== null) {
    days.push({ url: match[1], label: match[2].trim() });
  }
  return days;
}

async function fetchYearPapers(year) {
  console.log(`\n--- ICCV ${year} ---`);

  const baseUrl = `https://openaccess.thecvf.com/ICCV${year}`;
  let allPapers = [];

  // Try day=all first for years that support it
  if (year !== '2019') {
    try {
      const html = await fetchPage(`${baseUrl}?day=all`);
      const papers = parsePapers(html, year);
      if (papers.length > 0) {
        console.log(`  Found ${papers.length} papers (using ?day=all)`);
        return papers;
      }
    } catch (e) {
      console.log(`  ?day=all failed: ${e.message}`);
    }
  }

  // Fall back to day-based fetching (especially for ICCV 2019)
  try {
    const mainHtml = await fetchPage(baseUrl);
    const dayLinks = parseDayLinks(mainHtml, year);
    console.log(`  Found ${dayLinks.length} day pages`);

    if (dayLinks.length === 0) {
      console.log(`  No day links found`);
      return [];
    }

    for (const day of dayLinks) {
      try {
        console.log(`  Fetching ${day.label}...`);
        const dayHtml = await fetchPage(`https://openaccess.thecvf.com/${day.url}`);
        const dayPapers = parsePapers(dayHtml, year);
        console.log(`    Found ${dayPapers.length} papers`);
        allPapers.push(...dayPapers);
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.log(`    Error: ${e.message}`);
      }
    }

    // Deduplicate
    const seen = new Set();
    const unique = allPapers.filter(p => {
      const key = (p.title + '|' + (p.authors || []).join(',')).toLowerCase().substring(0, 200);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`  Total: ${unique.length} unique papers`);
    return unique;

  } catch (e) {
    console.log(`  Failed: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('\n=== Fetching ICCV from CVF Open Access ===\n');

  let totalPapers = 0;

  for (const year of YEARS) {
    const papers = await fetchYearPapers(year);

    if (papers.length > 0) {
      const outputPath = path.join(OUTPUT_DIR, `iccv${year}.json`);
      fs.writeFileSync(outputPath, JSON.stringify({ papers }, null, 2));
      console.log(`  Saved ${papers.length} papers to iccv${year}.json`);
      totalPapers += papers.length;
    }

    // Rate limiting between years
    if (year !== YEARS[YEARS.length - 1]) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== Total: ${totalPapers} papers ===`);
  console.log('\n=== Done ===');
}

main().catch(console.error);