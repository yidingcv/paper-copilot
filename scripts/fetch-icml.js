const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * 延时函数，保护目标服务器
 * @param {number} ms 毫秒
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 年份与 PMLR 卷号的映射表
const yearToVolume = {
    "2025": "v267",
    "2024": "v235",
    "2023": "v202",
    "2022": "v162",
    "2021": "v139",
    "2020": "v119",
    "2019": "v97",
    "2018": "v80",
    "2017": "v70"
};

async function scrapeICML(year) {
    const vol = yearToVolume[year.toString()];
    if (!vol) {
        console.warn(`[跳过] 未找到 ${year} 年的卷号映射，请先在映射表中添加。`);
        return;
    }

    const url = `https://proceedings.mlr.press/${vol}/`;
    console.log(`[开始] 正在抓取 ICML ${year} (Volume: ${vol})...`);

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        const papers = [];

        $('.paper').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            
            // 作者解析
            const authorsText = $(element).find('.authors').text();
            const authors = authorsText.split(',').map(a => a.trim()).filter(a => a !== "");

            // 链接解析
            const links = $(element).find('.links a');
            let paperUrl = "";
            let pdfUrl = "";
            let suppUrl = null;

            links.each((i, link) => {
                const text = $(link).text().toLowerCase();
                const href = $(link).attr('href');
                if (text.includes('abs') || text.includes('html')) {
                    paperUrl = href;
                } else if (text.includes('pdf')) {
                    pdfUrl = href;
                } else if (text.includes('supp')) {
                    suppUrl = href;
                }
            });

            // 生成唯一 ID
            const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50); // 截断防止文件名过长
            const paperId = `${cleanTitle}_ICML_${year}_paper`;

            papers.push({
                id: paperId,
                title: title,
                authors: authors,
                year: year.toString(),
                venue: "icml",
                url: paperUrl,
                pdfUrl: pdfUrl,
                suppUrl: suppUrl,
                arxivUrl: null
            });
        });

        // 存储路径处理
        const dirPath = path.join(process.cwd(), 'public', 'paperlists', 'icml');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, `icml${year}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ papers }, null, 2), 'utf-8');

        console.log(`[成功] ICML ${year} 完成，共获取 ${papers.length} 篇论文。`);

    } catch (error) {
        console.error(`[错误] 抓取 ICML ${year} 失败: ${error.message}`);
    }
}

/**
 * 主程序：定义要抓取的年份列表
 */
async function main() {
    const targetYears = [2021, 2022, 2023, 2024, 2025]; // 你可以在这里添加更多年份
    
    for (const year of targetYears) {
        await scrapeICML(year);
        // 每抓完一年休息 2 秒，做个文明的爬虫
        if (year !== targetYears[targetYears.length - 1]) {
            console.log("等待 2 秒后继续...");
            await sleep(2000);
        }
    }
    console.log("\n--- 所有任务处理完毕 ---");
}

main();