const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

/**
 * 1. 配置区
 */
const YEARS_TO_CRAWL = [2026, 2025, 2024, 2023, 2022, 2021]; 
const VENUE_NAME = 'tnnls';
const DBLP_BASE_URL = 'https://dblp.org/db/journals/tnn/tnn';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://dblp.org/',
    'Connection': 'keep-alive'
};

/**
 * 生成 ID: 姓氏_标题_TNNLS_年份_paper
 */
function generatePaperId(title, authors, year) {
    const lastName = authors.length > 0 ? authors[0].split(' ').pop().replace(/[^a-zA-Z]/g, '') : 'Unknown';
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60);
    return `${lastName}_${cleanTitle}_TNNLS_${year}_paper`;
}

/**
 * 构造 IEEE PDF 直链
 */
function convertToPdfUrl(ieeeUrl) {
    if (ieeeUrl && ieeeUrl.includes('arnumber=')) {
        const arnumber = ieeeUrl.match(/arnumber=(\d+)/)?.[1];
        if (arnumber) return `https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=${arnumber}`;
    }
    // 处理 DOI 格式
    if (ieeeUrl && ieeeUrl.includes('10.1109')) {
        const parts = ieeeUrl.split('/');
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
            return `https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=${lastPart}`;
        }
    }
    return ieeeUrl;
}

async function startCrawl() {
    console.log(`--- 启动 TNNLS (Neural Networks and Learning Systems) 抓取 ---`);

    for (const year of YEARS_TO_CRAWL) {
        // 计算卷号: 1990 是 Vol.1
        const volume = year - 1989;
        if (volume <= 0) continue;

        const targetUrl = `${DBLP_BASE_URL}${volume}.html`;
        console.log(`\n[正在访问] ${year} 年 (Vol. ${volume}) -> ${targetUrl}`);

        try {
            // 随机延迟 3-5 秒
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));

            const response = await axios.get(targetUrl, { headers: HEADERS, timeout: 30000 });
            const $ = cheerio.load(response.data);
            
            if ($('title').text().includes('Attention Required') || $('title').text().includes('Cloudflare')) {
                console.error(`❌ 被拦截：请在浏览器中手动通过一次 DBLP 的人机验证。`);
                continue;
            }

            const entries = $('.entry.article');
            let yearPapers = [];

            entries.each((_, el) => {
                const $el = $(el);
                const title = $el.find('.title').text().trim().replace(/\.$/, '');
                
                // 过滤非论文条目 (如目录、封面、勘误简报等)
                if (title.startsWith('[') || title.length < 15) return;

                const authors = [];
                $el.find('span[itemprop="author"] [itemprop="name"]').each((_, auth) => {
                    authors.push($(auth).text().trim());
                });

                // 提取链接
                const rawUrl = $el.find('nav.publ > ul > li.drop-down > div.head a').first().attr('href') || "";
                const pdfUrl = convertToPdfUrl(rawUrl);

                if (title && rawUrl) {
                    yearPapers.push({
                        id: generatePaperId(title, authors, year),
                        title,
                        authors,
                        year: year.toString(),
                        venue: VENUE_NAME,
                        url: rawUrl,
                        pdfUrl: pdfUrl
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
                console.log(`   ⚠️ 该年份暂时没有有效论文。`);
            }

        } catch (err) {
            console.error(`   ❌ 请求失败: ${err.message}`);
        }
    }
}

startCrawl();