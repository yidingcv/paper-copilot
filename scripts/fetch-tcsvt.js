const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

/**
 * 1. 配置区
 */
const YEARS_TO_CRAWL = [2026, 2025, 2024]; 
const VENUE_NAME = 'tcsvt';
// 注意：DBLP 数据库中该期刊的 ID 是 tcsv
const DBLP_ID = 'tcsv'; 
const DBLP_BASE_URL = `https://dblp.org/db/journals/${DBLP_ID}/${DBLP_ID}`;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Referer': 'https://dblp.org/'
};

function generatePaperId(title, authors, year) {
    const lastName = authors.length > 0 ? authors[0].split(' ').pop().replace(/[^a-zA-Z]/g, '') : 'Unknown';
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60);
    return `${lastName}_${cleanTitle}_TCSVT_${year}_paper`;
}

function convertToPdfUrl(ieeeUrl) {
    if (ieeeUrl && ieeeUrl.includes('arnumber=')) {
        const arnumber = ieeeUrl.match(/arnumber=(\d+)/)?.[1];
        if (arnumber) return `https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=${arnumber}`;
    }
    return ieeeUrl;
}

async function startCrawl() {
    console.log(`--- 修正路径：启动 TCSVT 论文抓取 ---`);

    for (const year of YEARS_TO_CRAWL) {
        // 1991 是 Vol.1 -> 2024 是 Vol.34
        const volume = year - 1990;
        if (volume <= 0) continue;

        const targetUrl = `${DBLP_BASE_URL}${volume}.html`;
        console.log(`\n[正在尝试] ${year} 年 (Vol. ${volume}) -> ${targetUrl}`);

        try {
            await new Promise(r => setTimeout(r, 3000)); // 礼貌延迟

            const response = await axios.get(targetUrl, { headers: HEADERS });
            const $ = cheerio.load(response.data);
            
            const entries = $('.entry.article');
            let yearPapers = [];

            entries.each((_, el) => {
                const $el = $(el);
                const title = $el.find('.title').text().trim().replace(/\.$/, '');
                if (title.startsWith('[') || title.length < 15) return;

                const authors = [];
                $el.find('span[itemprop="author"] [itemprop="name"]').each((_, auth) => {
                    authors.push($(auth).text().trim());
                });

                const rawUrl = $el.find('nav.publ > ul > li.drop-down > div.head a').first().attr('href') || "";
                
                if (title && rawUrl) {
                    yearPapers.push({
                        id: generatePaperId(title, authors, year),
                        title,
                        authors,
                        year: year.toString(),
                        venue: VENUE_NAME,
                        url: rawUrl,
                        pdfUrl: convertToPdfUrl(rawUrl)
                    });
                }
            });

            if (yearPapers.length > 0) {
                const outDir = path.join(process.cwd(), 'public', 'paperlists', VENUE_NAME);
                await fs.ensureDir(outDir);
                const filePath = path.join(outDir, `${VENUE_NAME}${year}.json`);
                await fs.writeJson(filePath, { papers: yearPapers }, { spaces: 2 });
                console.log(`   ✅ 抓取成功！有效论文: ${yearPapers.length} 篇`);
            } else {
                console.log(`   ⚠️ 该页面未提取到有效论文，可能尚未收录。`);
            }

        } catch (err) {
            console.error(`   ❌ 访问失败: ${err.message}`);
        }
    }
}

startCrawl();