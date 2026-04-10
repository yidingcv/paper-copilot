const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const YEARS_TO_CRAWL = [2026, 2025]; 
const BASE_ARCHIVE_URL = 'https://ojs.aaai.org/index.php/AAAI/issue/archive';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Connection': 'close'
};

/**
 * 核心对齐逻辑：只识别主会议长文
 */
function isOfficialMainTrack(title, sectionTitle) {
    const sTitle = sectionTitle.toLowerCase();
    const pTitle = title.toLowerCase();

    // 1. 定义绝对排除的关键词（这些条目即便在 AAAI 分册内，也不计入 DBLP 主会）
    const blacklist = [
        'student abstract', 'demonstration', 'doctoral consortium', 'undergraduate',
        'iaai', 'eaai', 'journal track', 'senior member', 'new faculty',
        'workshop', 'tutorial', 'keynote', 'invited talk', 'panel', 'preface',
        'front matter', 'back matter', 'awards', 'getting started'
    ];
    if (blacklist.some(item => sTitle.includes(item))) return false;

    // 2. 定义主会议承认的 Track 关键词
    const whitelist = [
        'technical track', 
        'special track', 
        'ai alignment', 
        'social impact', 
        'emerging trends',
        'main track'
    ];
    
    // 如果 Section 标题包含白名单关键词，或者是具体的学术方向（如 "NLP", "Vision" 等没有出现在黑名单里的）
    const hasWhitelistKey = whitelist.some(item => sTitle.includes(item));
    
    // 3. 标题内容二次过滤
    // 过滤掉带有 [IAAI] 或 [EAAI] 前缀的标题
    if (pTitle.startsWith('iaai') || pTitle.startsWith('eaai')) return false;
    // 过滤短条目（元数据、勘误说明等）
    if (title.length < 20) return false;

    return hasWhitelistKey || sTitle.includes('track');
}

function generateId(title, authors, year) {
    const lastName = authors.length > 0 ? authors[0].split(' ').pop().replace(/[^a-zA-Z]/g, '') : 'Unknown';
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60);
    return `${lastName}_${cleanTitle}_AAAI_${year}_paper`;
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { headers: HEADERS, timeout: 45000 });
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 6000));
        }
    }
}

async function startCrawl() {
    try {
        console.log('--- 启动 AAAI Main Track 深度清洗抓取 ---');
        let allIssues = [];
        for (let p = 1; p <= 6; p++) {
            console.log(`正在扫描归档页: ${p}`);
            const { data } = await fetchWithRetry(`${BASE_ARCHIVE_URL}/${p}`);
            const $ = cheerio.load(data);
            $('ul.issues_archive li a.title').each((_, el) => {
                allIssues.push({ text: $(el).text().trim(), url: $(el).attr('href') });
            });
        }

        for (const year of YEARS_TO_CRAWL) {
            console.log(`\n【开始处理 ${year} 年】`);
            const targetLinks = allIssues.filter(i => 
                i.text.includes(year.toString()) || i.text.includes(`-${year.toString().slice(-2)}`)
            ).map(i => i.url);

            const paperMap = new Map();
            let totalProcessed = 0;

            for (const issueUrl of targetLinks) {
                try {
                    console.log(`解析分册: ${issueUrl}`);
                    const { data: html } = await fetchWithRetry(issueUrl);
                    const $issue = cheerio.load(html);

                    $issue('.section').each((_, sectionEl) => {
                        const sectionTitle = $issue(sectionEl).find('h2, h3').first().text().trim() || "Main Track";
                        
                        $issue(sectionEl).find('.obj_article_summary').each((_, el) => {
                            totalProcessed++;
                            const title = $issue(el).find('.title a').text().trim();
                            
                            // 执行严格主会校验
                            if (!isOfficialMainTrack(title, sectionTitle)) return;

                            const authorsRaw = $issue(el).find('.authors').text().trim();
                            const authors = authorsRaw ? authorsRaw.split(',').map(a => a.trim()) : [];
                            const url = $issue(el).find('.title a').attr('href');
                            const pdfViewUrl = $issue(el).find('.obj_galley_link.pdf').attr('href');
                            const pdfUrl = pdfViewUrl ? pdfViewUrl.replace('/view/', '/download/') : "";

                            if (title && url && !paperMap.has(title.toLowerCase())) {
                                paperMap.set(title.toLowerCase(), {
                                    id: generateId(title, authors, year),
                                    title, authors, year: year.toString(), venue: "aaai", url, pdfUrl
                                });
                            }
                        });
                    });
                    // 礼貌延迟，防止被封
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.error(`[失败] ${issueUrl}`);
                }
            }

            const finalPapers = Array.from(paperMap.values());
            const outPath = path.join(process.cwd(), 'public', 'paperlists', 'aaai', `aaai${year}.json`);
            await fs.ensureDir(path.dirname(outPath));
            await fs.writeJson(outPath, { papers: finalPapers }, { spaces: 2 });

            console.log(`✅ ${year} 年抓取完毕！`);
            console.log(`- 扫描条目总数: ${totalProcessed}`);
            console.log(`- 识别主会篇数: ${finalPapers.length} (目标对齐: 4566 左右)`);
        }
    } catch (error) {
        console.error(error);
    }
}

startCrawl();