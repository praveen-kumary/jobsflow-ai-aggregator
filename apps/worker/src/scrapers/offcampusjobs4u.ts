import * as cheerio from "cheerio";
import { IScraper, DiscoveredItem, DetailResult } from "./base";
import { USER_AGENT } from "../utils/user-agent";
import { rateLimit } from "../utils/rate-limiter";
import { extractTitleGuesses } from "../utils/title-guess";
import { extractBestApplyUrl } from "../utils/apply-url-extractor";

export class OffCampusJobs4uScraper implements IScraper {
  sourceId = "source_offcampusjobs4u";
  baseUrl = "https://offcampusjobs4u.com";

  async discover(): Promise<DiscoveredItem[]> {
    await rateLimit(this.sourceId, 2500);

    const items: DiscoveredItem[] = [];
    // Scrape HTML listing pages (respects robots.txt which blocks /feed/)
    for (const page of [1, 2]) {
      const pageUrl = page === 1 ? this.baseUrl : `${this.baseUrl}/page/${page}/`;
      try {
        const res = await fetch(pageUrl, {
          headers: { "User-Agent": USER_AGENT },
        });
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);

        // TagDiv theme on offcampusjobs4u places job links in .td-module-title a and h3.entry-title a
        $(".td-module-title a, h3.entry-title a, h2.entry-title a, a[rel='bookmark']").each((_, el) => {
          let href = $(el).attr("href") || "";
          let title = $(el).text().trim();

          if (href && !href.startsWith("http")) {
            href = new URL(href, this.baseUrl).toString();
          }

          // Clean query params / hash
          try {
            const parsed = new URL(href);
            href = `${parsed.origin}${parsed.pathname}`;
          } catch {
            // Keep original href
          }

          if (
            href &&
            title &&
            title.length > 15 &&
            !href.includes("/category/") &&
            !href.includes("/tag/") &&
            !href.includes("/page/") &&
            !href.includes("/jobs/") &&
            href !== `${this.baseUrl}/` &&
            href !== `https://www.offcampusjobs4u.com/` &&
            !items.some((i) => i.url === href)
          ) {
            items.push({ url: href, title });
          }
        });
      } catch (err) {
        console.error(`Error discovering offcampusjobs4u page ${page}:`, err);
      }
    }

    return items;
  }

  async scrapeDetail(url: string): Promise<DetailResult> {
    await rateLimit(this.sourceId, 2500);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let title = $("h1.entry-title, h1").first().text().trim();
    if (!title) {
      title = $("title").text().split("|")[0].trim();
    }

    // Extract category tags from category / tag links
    const categoryTags: string[] = [];
    $("a[rel='category tag'], .entry-categories a, .cat-links a, a[rel='tag']").each((_, el) => {
      const tag = $(el).text().trim();
      if (tag && !categoryTags.includes(tag)) {
        categoryTags.push(tag);
      }
    });

    // Check for batch year in title
    const batchMatches = title.match(/\b(202[2-7])\b/g);
    if (batchMatches) {
      for (const b of batchMatches) {
        if (!categoryTags.includes(b)) categoryTags.push(b);
      }
    }

    // Guess company, role, city from title
    const guesses = extractTitleGuesses(title);

    // Body content
    const contentEl = $(".td-post-content, .entry-content, article").first();
    const rawHtml = contentEl.length > 0 ? contentEl.html() || html : html;

    return {
      title,
      html: rawHtml,
      categoryTags,
      companyGuess: guesses.companyGuess,
      roleGuess: guesses.roleGuess,
      cityGuess: guesses.cityGuess,
      applyUrl: extractBestApplyUrl(rawHtml, url, guesses.companyGuess),
    };
  }
}
