import * as cheerio from "cheerio";
import { IScraper, DiscoveredItem, DetailResult } from "./base";
import { USER_AGENT } from "../utils/user-agent";
import { rateLimit } from "../utils/rate-limiter";
import { extractTitleGuesses } from "../utils/title-guess";
import { extractBestApplyUrl } from "../utils/apply-url-extractor";

export class JobsNetScraper implements IScraper {
  sourceId = "source_jobsnet";
  baseUrl = "https://jobsnet.in";

  async discover(): Promise<DiscoveredItem[]> {
    await rateLimit(this.sourceId, 2500);

    const items: DiscoveredItem[] = [];
    const listingUrls = [
      `${this.baseUrl}/`,
      `${this.baseUrl}/page/2/`,
    ];

    for (const url of listingUrls) {
      try {
        console.log(`[JobsNet] Fetching discovery page: ${url}`);
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
        });
        if (!res.ok) {
          console.warn(`[JobsNet] Discovery failed for ${url}: status ${res.status}`);
          continue;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        $("article h2 a, article h3 a, .entry-title a").each((_, el) => {
          let href = $(el).attr("href") || "";
          let title = $(el).text().trim();

          if (href && !href.startsWith("http")) {
            href = new URL(href, this.baseUrl).toString();
          }

          // Clean up query params / hash
          try {
            const parsed = new URL(href);
            href = `${parsed.origin}${parsed.pathname}`;
          } catch {
            // Keep original href
          }

          const lowerHref = href.toLowerCase();
          const lowerTitle = title.toLowerCase();

          // Exclude non-job informational pages (interview patterns, syllabus, resume builder, etc.)
          const isNonJob =
            lowerHref.includes("selection-process") ||
            lowerHref.includes("interview-questions") ||
            lowerHref.includes("resume-builder") ||
            lowerHref.includes("recruitment-process") ||
            lowerHref.includes("/category/") ||
            lowerHref.includes("/page/") ||
            lowerHref.includes("/tag/") ||
            lowerTitle.includes("selection process") ||
            lowerTitle.includes("interview guide") ||
            lowerTitle.includes("test pattern") ||
            lowerTitle.includes("resume builder");

          if (
            href &&
            title &&
            title.length > 15 &&
            !isNonJob &&
            href !== `${this.baseUrl}/` &&
            !items.some((i) => i.url === href)
          ) {
            items.push({ url: href, title });
          }
        });
      } catch (err) {
        console.error(`[JobsNet] Error discovering ${url}:`, err);
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
      title = $("title").text().split("-")[0].trim();
    }

    const categoryTags: string[] = [];
    $("a[rel='category tag'], .cat-links a, a[rel='tag'], .post-tags a").each((_, el) => {
      const tag = $(el).text().trim();
      if (tag && !categoryTags.includes(tag)) {
        categoryTags.push(tag);
      }
    });

    // Check batch year in title
    const batchMatches = title.match(/\b(202[2-7])\b/g);
    if (batchMatches) {
      for (const b of batchMatches) {
        if (!categoryTags.includes(b)) categoryTags.push(b);
      }
    }

    const guesses = extractTitleGuesses(title);

    const contentEl = $(".entry-content, article, .post-content").first();
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
