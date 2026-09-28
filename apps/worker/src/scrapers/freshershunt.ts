import * as cheerio from "cheerio";
import { IScraper, DiscoveredItem, DetailResult } from "./base";
import { USER_AGENT } from "../utils/user-agent";
import { rateLimit } from "../utils/rate-limiter";
import { extractTitleGuesses } from "../utils/title-guess";
import { extractBestApplyUrl } from "../utils/apply-url-extractor";

export class FreshersHuntScraper implements IScraper {
  sourceId = "source_freshershunt";
  baseUrl = "https://freshershunt.in";

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

        $("article").each((_, el) => {
          const card = $(el);
          const titleLink = card.find("h2.entry-title a, h2 a, a[rel='bookmark']").first();
          let href = titleLink.attr("href") || "";
          let title = titleLink.text().trim();

          if (href && !href.startsWith("http")) {
            href = new URL(href, this.baseUrl).toString();
          }

          if (href && title && !items.some((i) => i.url === href)) {
            items.push({ url: href, title });
          }
        });
      } catch (err) {
        console.error(`Error discovering freshershunt page ${page}:`, err);
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

    // Extract tags
    const categoryTags: string[] = [];
    $("a[rel='category tag'], a[rel='tag'], .entry-categories a, .cat-links a").each((_, el) => {
      const tag = $(el).text().trim();
      if (tag && !categoryTags.includes(tag)) {
        categoryTags.push(tag);
      }
    });

    // Check batch years
    const batchMatches = title.match(/\b(202[2-7])\b/g);
    if (batchMatches) {
      for (const b of batchMatches) {
        if (!categoryTags.includes(b)) categoryTags.push(b);
      }
    }

    // Guesses from title
    const guesses = extractTitleGuesses(title);

    const contentEl = $(".entry-content, article").first();
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
