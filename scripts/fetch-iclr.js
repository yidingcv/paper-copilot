const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置：支持 2020-2024
const YEARS = [2025, 2024];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ensureDirectory = (filePath) => {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });
};

async function fetchICLR(year) {
    console.log(`\n>>> 正在启动 ICLR ${year} 专项抓取任务...`);
    let allPapers = [];
    let offset = 0;
    const limit = 1000;

    const isV2 = year >= 2024;
    const baseUrl = isV2 ? 'https://api2.openreview.net/notes' : 'https://api.openreview.net/notes';

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    try {
        while (true) {
            console.log(`    正在请求 Offset: ${offset}...`);
            
            // 核心变动：统一使用 content.venueid
            // ICLR 的 VenueID 格式非常统一：ICLR.cc/年份/Conference
            const params = { limit, offset };

            if (year === 2020) {
                // 2020年：数据库没存 venueid 字段，只能走 invitation 路径
                params['invitation'] = `ICLR.cc/2020/Conference/-/Blind_Submission`;
            } else {
                // 2021-2023：数据库存了 venueid 字段，走这个更准
                params['content.venueid'] = `ICLR.cc/${year}/Conference`;
            }

            const response = await axios.get(baseUrl, { params, headers, timeout: 40000 });
            const notes = response.data.notes || [];
            
            if (notes.length === 0) break;
            const acceptedNotes = notes.filter(n => {
                const c = n.content;
                const venueStr = isV2 ? (c.venue?.value || "") : (c.venue || "");
                const lowV = venueStr.toLowerCase();

                // 1. 排除明确的撤稿（这些通常不计入录取）
                if (lowV.includes('withdrawn')) return false;

                // 2. 针对 ICLR 2023 的特殊录取标签：Notable Top 5%, Notable Top 25%, Poster
                // 针对 2020-2022 的标签：Oral, Spotlight, Poster
                // 针对 2024+ 的标签：Accept
                const isAccepted = 
                    lowV.includes('poster') || 
                    lowV.includes('notable') || 
                    lowV.includes('oral') || 
                    lowV.includes('spotlight') ||
                    lowV.includes('accept');

                // 3. 针对 2020 等早期年份的兜底策略：
                // 如果没有上述关键字，但存在 pdate（发布日期），在 V1 接口中通常意味着已录用发表
                const hasPdate = !!n.pdate;

                return isAccepted || (year <= 2020 && hasPdate);
            });
            // 适配数据映射 (不再需要 filter，API 返回的全是录取论文)
            const formatted = acceptedNotes.map(n => {
                const c = n.content;
                // V2 的数据在 .value 中，V1 直接在属性下
                const getV = (obj, key) => isV2 ? (obj[key]?.value) : obj[key];

                return {
                    id: `iclr${year}_${n.id}`,
                    title: getV(c, 'title') || "Untitled",
                    authors: getV(c, 'authors') || [],
                    year: year.toString(),
                    venue: "iclr",
                    url: `https://openreview.net/forum?id=${n.id}`,
                    pdfUrl: `https://openreview.net/pdf?id=${n.id}`,
                    suppUrl: isV2 
                        ? (c.supplementary_material?.value ? `https://openreview.net${c.supplementary_material.value}` : null) 
                        : (c.supplementary_material || null),
                    doiUrl: null
                };
            });

            allPapers = allPapers.concat(formatted);
            console.log(`    当前已获取: ${allPapers.length} 篇...`);

            if (notes.length < limit) break;
            offset += limit;
            
            await sleep(2000 + Math.random() * 1000);
        }

        // 写入文件
        if (allPapers.length > 0) {
            const outputPath = path.join(__dirname, `../public/paperlists/iclr/iclr${year}.json`);
            ensureDirectory(outputPath);
            fs.writeFileSync(outputPath, JSON.stringify({ papers: allPapers }, null, 2));
            console.log(`    ✅ ICLR ${year} 抓取完成，共 ${allPapers.length} 篇。`);
        } else {
            console.log(`    ⚠️ ICLR ${year} 未找到数据，请检查该年份 VenueID 是否特殊。`);
        }

    } catch (err) {
        console.error(`    ❌ 错误 [${year}]: ${err.message}`);
    }
}

async function run() {
    console.log("=== ICLR VenueID 模式集成抓取开始 ===");
    for (const year of YEARS) {
        await fetchICLR(year);
        if (year !== YEARS[YEARS.length - 1]) await sleep(5000);
    }
    console.log("\n=== 所有任务已完成 ===");
}

run();