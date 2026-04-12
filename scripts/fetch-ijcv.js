const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// 1. 配置区
const YEARS_TO_CRAWL = [2022, 2021, 2020]; 
const VENUE_NAME = 'ijcv';
const DBLP_BASE_URL = 'https://dblp.org/db/journals/ijcv/ijcv';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://dblp.org/'
};

/**
 * IJCV 卷号计算器 (Springer 逻辑)
 * 2024=132, 2023=131... 
 * 这个规律在 2013 年之后非常稳定 (Vol = Year - 1892)
 */
function getVolumeByYear(year) {
    const mapping = {
        2026: 134, 2025: 133, 2024: 132, 2023: 131,
        2022: 130, 2021: 129, 2020: 128, 2019: 127,
        2018: 126, 2017: 125, 2016: 116, // 注意: 2016及以前一年可能有多卷
        2015: 111, 2014: 106, 2013: 101
    };
    return mapping[year] || (year > 2013 ? year - 1892 : null);
}

function generatePaperId(title, authors, year) {
    const lastName = authors.length > 0 ? authors[0].split(' ').pop().replace(/[^a-zA-Z]/g, '') : 'Unknown';
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60);
    return `${lastName}_${cleanTitle}_IJCV_${year}_paper`;
}

function convertToPdfUrl(rawUrl) {
    if (rawUrl && rawUrl.includes('10.1007')) {
        // 尝试匹配 Springer 的 DOI 结构
        const parts = rawUrl.split('doi.org/');
        const doi = parts.length > 1 ? parts[1] : null;
        if (doi) return `https://link.springer.com/content/pdf/${doi}.pdf`;
    }
    return rawUrl;
}

async function startCrawl() {
    console.log(`--- 启动 IJCV 论文抓取 (多年份支持版) ---`);

    for (const year of YEARS_TO_CRAWL) {
        const volume = getVolumeByYear(year);
        if (!volume) {
            console.warn(`⚠️  未定义 ${year} 年的卷号映射，跳过。`);
            continue;
        }

        const targetUrl = `${DBLP_BASE_URL}${volume}.html`;
        console.log(`\n[处理中] ${year} 年 (Vol. ${volume}) -> ${targetUrl}`);

        try {
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
            const { data } = await axios.get(targetUrl, { headers: HEADERS });
            const $ = cheerio.load(data);
            
            if ($('title').text().includes('Attention Required')) {
                console.error(`❌ 被拦截，请稍后再试。`);
                break;
            }

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
                const outPath = path.join(process.cwd(), 'public', 'paperlists', VENUE_NAME, `${VENUE_NAME}${year}.json`);
                await fs.ensureDir(path.dirname(outPath));
                await fs.writeJson(outPath, { papers: yearPapers }, { spaces: 2 });
                console.log(`   ✅ 成功！保存了 ${yearPapers.length} 篇论文。`);
            }
        } catch (err) {
            console.error(`   ❌ 访问出错: ${err.message}`);
        }
    }
}

startCrawl();