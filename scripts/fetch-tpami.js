const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const YEARS_TO_CRAWL = [2026]; // 建议先试这几年，2026 卷号可能还没出全
const VENUE_NAME = 'tpami';
const DBLP_BASE_URL = 'https://dblp.org/db/journals/pami/pami';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://dblp.org/',
    'Connection': 'keep-alive'
};

function generatePaperId(title, authors, year) {
    const lastName = authors.length > 0 ? authors[0].split(' ').pop().replace(/[^a-zA-Z]/g, '') : 'Unknown';
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60);
    return `${lastName}_${cleanTitle}_TPAMI_${year}_paper`;
}

async function startCrawl() {
    console.log(`--- TPAMI 论文抓取工具 (Debug 模式) ---`);

    for (const year of YEARS_TO_CRAWL) {
        const volume = year - 1978;
        const targetUrl = `${DBLP_BASE_URL}${volume}.html`;
        console.log(`\n[正在访问] ${year} 年 (Vol. ${volume}) -> ${targetUrl}`);

        try {
            // 增加随机延迟 3-6 秒
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));

            const response = await axios.get(targetUrl, { headers: HEADERS });
            const $ = cheerio.load(response.data);
            
            // 1. 检查是否被封锁
            const pageTitle = $('title').text();
            if (pageTitle.includes('Attention Required') || pageTitle.includes('Cloudflare')) {
                console.error(`❌ 被拦截：DBLP 弹出人机验证，请在浏览器中打开链接点一下验证，或更换 IP。`);
                continue;
            }

            // 2. 查找条目
            const entries = $('.entry.article');
            console.log(`   发现原始条目数: ${entries.length}`);

            if (entries.length === 0) {
                console.warn(`   ⚠️ 页面没有论文数据，可能是卷号 ${volume} 尚未发布。`);
                continue;
            }

            let yearPapers = [];

            entries.each((_, el) => {
                const $el = $(el);
                const title = $el.find('.title').text().trim().replace(/\.$/, '');
                
                // 排除非论文内容 (如 Editor's Note, Index 等)
                if (title.startsWith('[') || title.length < 15) return;

                const authors = [];
                $el.find('span[itemprop="author"] [itemprop="name"]').each((_, auth) => {
                    authors.push($(auth).text().trim());
                });

                // 3. 极其重要的链接提取逻辑
                // DBLP 的链接可能在图标里，也可能在下拉菜单里
                let rawUrl = "";
                // 尝试找第一个图标的链接
                const firstLink = $el.find('nav.publ > ul > li.drop-down > div.head a').first().attr('href');
                const secondLink = $el.find('nav.publ > ul > li.drop-down > div.body ul li a').first().attr('href');
                rawUrl = firstLink || secondLink || "";

                // 4. PDF 链接构造 (IEEE 专用)
                let pdfUrl = "";
                if (rawUrl.includes('arnumber=')) {
                    const arnumber = rawUrl.match(/arnumber=(\d+)/)?.[1];
                    if (arnumber) pdfUrl = `https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=${arnumber}`;
                }

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

            // 5. 存储
            if (yearPapers.length > 0) {
                const outDir = path.join(process.cwd(), 'public', 'paperlists', VENUE_NAME);
                await fs.ensureDir(outDir);
                const filePath = path.join(outDir, `${VENUE_NAME}${year}.json`);
                await fs.writeJson(filePath, { papers: yearPapers }, { spaces: 2 });
                console.log(`   ✅ 抓取成功！有效论文: ${yearPapers.length} 篇 -> 已保存`);
            } else {
                console.log(`   ❌ 匹配失败：虽然找到了条目，但没有通过标题或链接过滤。`);
            }

        } catch (err) {
            console.error(`   ❌ 请求发生错误: ${err.message}`);
        }
    }
}

startCrawl();