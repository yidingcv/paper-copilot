#!/usr/bin/env node

/**
 * Fetch CVPR papers from CVF Open Access
 * Primary source: openaccess.thecvf.com/CVPR2025
 * Usage: node scripts/fetch-cvf.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'paperlists');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const cvprDir = path.join(OUTPUT_DIR, 'cvpr');
if (!fs.existsSync(cvprDir)) {
  fs.mkdirSync(cvprDir, { recursive: true });
}

/**
 * Parse CVF page HTML to extract papers
 */
function parseCVFPapers(html, year) {
  const papers = [];

  // Extract paper blocks - each paper has dt.ptitle followed by dd with author forms
  const paperBlockPattern = /<dt class="ptitle"><br><a href="([^"]+)">([^<]+)<\/a><\/dt>\s*<dd>([\s\S]*?)<dd>\s*\[<a href="([^"]+)">pdf<\/a>]/g;

  let match;
  while ((match = paperBlockPattern.exec(html)) !== null) {
    const detailUrl = match[1];
    const title = match[2].trim();
    const authorBlock = match[3];
    const pdfUrl = match[4];

    // Extract authors from author forms
    const authorPattern = /query_author" value="([^"]+)"/g;
    const authors = [];
    let authorMatch;
    while ((authorMatch = authorPattern.exec(authorBlock)) !== null) {
      authors.push(authorMatch[1]);
    }

    // Determine paper type
    let type = 'paper';
    if (/workshop/i.test(title)) type = 'workshop';
    else if (/challenge/i.test(title)) type = 'challenge';

    papers.push({
      id: detailUrl.split('/').pop().replace('.html', ''),
      title: title,
      type: type,
      authors: authors,
      year: year.toString(),
      venue: 'cvpr',
      url: `https://openaccess.thecvf.com${detailUrl}`,
      pdfUrl: `https://openaccess.thecvf.com${pdfUrl}`
    });
  }

  return papers;
}

/**
 * Fetch CVF page
 */
async function fetchCVFPage(url) {
  console.log(`  Fetching ${url}...`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function main() {
  console.log('\n=== Fetching CVPR 2025 from CVF Open Access ===\n');

  try {
    // Fetch main conference papers
    const mainHtml = await fetchCVFPage('https://openaccess.thecvf.com/CVPR2025?day=all');
    const mainPapers = parseCVFPapers(mainHtml, 2025);
    console.log(`  Main conference papers: ${mainPapers.length}`);

    // Try workshops
    let workshopPapers = [];
    try {
      const workshopHtml = await fetchCVFPage('https://openaccess.thecvf.com/CVPR2025_Workshops?day=all');
      workshopPapers = parseCVFPapers(workshopHtml, 2025);
      console.log(`  Workshop papers: ${workshopPapers.length}`);
    } catch (e) {
      console.log(`  Workshops page not accessible: ${e.message}`);
    }

    // Combine and save
    const allPapers = [...mainPapers, ...workshopPapers];
    const papersOnly = allPapers.filter(p => p.type === 'paper');
    const challenges = allPapers.filter(p => p.type === 'challenge');
    const workshops = allPapers.filter(p => p.type === 'workshop');

    console.log(`\n  Total: ${allPapers.length}`);
    console.log(`  Papers: ${papersOnly.length}`);
    console.log(`  Workshops: ${workshops.length}`);
    console.log(`  Challenges: ${challenges.length}`);

    const outputPath = path.join(cvprDir, 'cvpr2025.json');
    fs.writeFileSync(outputPath, JSON.stringify({ papers: allPapers }, null, 2), 'utf-8');
    console.log(`\n  Saved to ${outputPath}`);

  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
