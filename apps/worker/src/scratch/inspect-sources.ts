import * as cheerio from "cheerio";
import { USER_AGENT } from "../utils/user-agent";

async function inspect(name: string, url: string) {
  console.log(`\n=== Inspecting ${name} (${url}) ===`);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log("HTML length:", html.length);
  console.log("Articles count:", $("article").length);
  console.log("h2 count:", $("h2").length);
  console.log("h3 count:", $("h3").length);

  const candidateLinks: { title: string; href: string }[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().trim();
    // Exclude social/nav links
    if (
      href.startsWith("http") &&
      !href.includes("whatsapp") &&
      !href.includes("telegram") &&
      !href.includes("category") &&
      !href.includes("page/") &&
      !href.endsWith(".com/") &&
      !href.endsWith(".in/") &&
      title.length > 15
    ) {
      if (!candidateLinks.some((c) => c.href === href)) {
        candidateLinks.push({ title, href });
      }
    }
  });

  console.log(`Found ${candidateLinks.length} post candidate links:`);
  candidateLinks.slice(0, 5).forEach((c, idx) => {
    console.log(`  [${idx}] ${c.title.slice(0, 60)} -> ${c.href}`);
  });
}

async function main() {
  await inspect("FreshersTech", "https://fresherstech.com/");
  await inspect("JobsNet", "https://jobsnet.in/");
}

main().catch(console.error);
