const axios = require("axios");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const parser = new xml2js.Parser();

// ✅ 配置年份
const years = [2025, 2024, 2023, 2022, 2021];
const PAGE_SIZE = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(title) {
  return title
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

/**
 * 抓取单个年份（分页）
 */
async function crawlYear(year) {
  console.log(`\n🚀 开始精确抓取 IROS ${year}`);

  let offset = 0;
  let allPapers = [];
  const seen = new Set();

  while (true) {
    const url = `https://dblp.org/search/publ/api?q=IROS%20${year}&h=${PAGE_SIZE}&f=${offset}&format=xml`;

    console.log(`📄 请求 ${year} offset=${offset}`);

    try {
      const { data } = await axios.get(url, { timeout: 30000 });
      const result = await parser.parseStringPromise(data);
      const hits = result?.result?.hits?.[0]?.hit || [];

      if (hits.length === 0) break;

      for (const item of hits) {
        try {
          const info = item.info[0];
          const title = info.title?.[0] || "";
          const venue = info.venue?.[0] || "";
          const type = info.type?.[0] || ""; // ✅ 获取条目类型（非常关键）

          // --- 核心过滤逻辑 ---

          // 1. 类型过滤：只保留正式论文，排除 "Editorship" 或 "Proceedings"
          if (type !== "Conference and Workshop Papers") continue;

          // 2. 场馆过滤
          if (!venue.toUpperCase().includes("IROS")) continue;
          if (venue.toLowerCase().includes("workshop")) continue;

          // 3. 严格排除会议目录/全称条目
          // 排除掉标题里包含会议全称或“Proceedings”的杂质
          const noisePattern = /International Conference on Intelligent Robots and Systems|Proceedings of|Front Matter|Table of Contents/i;
          if (noisePattern.test(title)) continue;

          // 4. 确保年份严格匹配
          if (info.year?.[0] !== year.toString()) continue;

          // 5. 过滤掉短标题或无作者条目（论文集通常没作者）
          const authors = info.authors?.[0]?.author?.map((a) =>
              typeof a === "string" ? a : a._
            ) || [];
          
          if (title.length < 25 || authors.length === 0) continue;

          // --- 结束过滤 ---

          const eeUrl = info.ee?.[0] || info.url?.[0] || null;

          const key = `${title.toLowerCase()}_${year}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const id = `${slugify(title)}_IROS_${year}_paper`;

          allPapers.push({
            id,
            title,
            authors,
            year: year.toString(),
            venue: "iros",
            url: eeUrl,
            pdfUrl: eeUrl && eeUrl.endsWith(".pdf") ? eeUrl : null,
            suppUrl: null,
            arxivUrl: eeUrl && eeUrl.includes("arxiv.org") ? eeUrl : null
          });
        } catch (err) {
          console.log("解析条目失败:", err.message);
        }
      }

      if (hits.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
      await sleep(500);

    } catch (err) {
      console.error(`❌ ${year} 失败:`, err.message);
      break;
    }
  }

  console.log(`✅ ${year} 过滤完成，最终有效论文: ${allPapers.length} 篇`);
  return allPapers;
}

function saveJSON(papers, year) {
  const dir = path.join(process.cwd(), "public", "paperlists", "iros");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `iros${year}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ papers }, null, 2), "utf-8" );
  console.log(`💾 保存: ${filePath}`);
}

async function main() {
  for (const year of years) {
    const papers = await crawlYear(year);
    saveJSON(papers, year);
  }
  console.log("\n🎉 全部抓取完成！");
}

main();