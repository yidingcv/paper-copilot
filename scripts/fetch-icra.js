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
  console.log(`\n🚀 开始精确抓取 ICRA ${year}`);

  let offset = 0;
  let allPapers = [];
  const seen = new Set();

  while (true) {
    const url = `https://dblp.org/search/publ/api?q=ICRA%20${year}&h=${PAGE_SIZE}&f=${offset}&format=xml`;

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
          const venue = (info.venue?.[0] || "").toUpperCase();
          const type = info.type?.[0] || ""; 

          // --- 核心过滤逻辑 ---

          // 1. 类型过滤：只保留正式论文，排除 "Editorship" (全书目录)
          if (type !== "Conference and Workshop Papers") continue;

          // 2. 场馆过滤：ICRA 包含直接录用和通过 RA-L 期刊录用的论文
          const isICRA = venue.includes("ICRA");
          const isRAL = venue.includes("RA-L") || venue.includes("ROBOTICS AND AUTOMATION LETTERS");
          if (!isICRA && !isRAL) continue;

          // 3. 严格排除 Workshop 和其他会议（如 IROS）的交叉结果
          if (venue.includes("WORKSHOP") || venue.includes("IROS")) continue;

          // 4. 严格排除会议行政条目（Message/Committee/Awards等）
          // 修正了之前针对 IROS 的关键词，改为针对 ICRA 的常见杂质
          const noisePattern = /International Conference on Robotics and Automation|Proceedings of|Front Matter|Table of Contents|Message from|Organizing Committee|Program Committee|Awards|Competition|Challenge|Session Introduction/i;
          if (noisePattern.test(title)) continue;

          // 5. 确保年份严格匹配
          if (info.year?.[0] !== year.toString()) continue;

          // 6. 过滤短标题或无作者条目（正式论文必有作者且标题较长）
          const authors = info.authors?.[0]?.author?.map((a) =>
              typeof a === "string" ? a : a._
            ) || [];
          
          if (title.length < 30 || authors.length === 0) continue;

          // --- 过滤结束 ---

          const eeUrl = info.ee?.[0] || info.url?.[0] || null;

          // 去重：转小写后存入 Set
          const key = `${title.toLowerCase()}_${year}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const id = `${slugify(title)}_ICRA_${year}_paper`;

          allPapers.push({
            id,
            title,
            authors,
            year: year.toString(),
            venue: "icra",
            url: eeUrl,
            pdfUrl: eeUrl && eeUrl.endsWith(".pdf") ? eeUrl : null,
            suppUrl: null,
            arxivUrl: eeUrl && eeUrl.includes("arxiv.org") ? eeUrl : null
          });
        } catch (err) {
          console.log("解析条目失败:", err.message);
        }
      }

      // 如果当前页不足 PAGE_SIZE，说明已经没有更多数据
      if (hits.length < PAGE_SIZE) break;

      offset += PAGE_SIZE;
      await sleep(800); // 略微增加延时防止触发 DBLP 频率限制

    } catch (err) {
      console.error(`❌ ${year} 失败:`, err.message);
      break;
    }
  }

  console.log(`✅ ${year} 过滤完成，最终有效论文: ${allPapers.length} 篇`);
  return allPapers;
}

function saveJSON(papers, year) {
  const dir = path.join(process.cwd(), "public", "paperlists", "icra");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `icra${year}.json`);
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