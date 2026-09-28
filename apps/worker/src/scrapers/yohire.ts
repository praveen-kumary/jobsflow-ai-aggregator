import * as cheerio from "cheerio";
import { IScraper, DiscoveredItem, DetailResult } from "./base";
import { USER_AGENT } from "../utils/user-agent";
import { rateLimit } from "../utils/rate-limiter";
import { extractTitleGuesses } from "../utils/title-guess";
import { extractBestApplyUrl } from "../utils/apply-url-extractor";

export class YoHireScraper implements IScraper {
  sourceId = "source_yohire";
  baseUrl = "https://yohire.in";

  async discover(): Promise<DiscoveredItem[]> {
    await rateLimit(this.sourceId, 2500);

    const items: DiscoveredItem[] = [];
    // Scrape first 2 pages to get ~20-30 candidate jobs
    for (const page of [1, 2]) {
      const pageUrl = page === 1 ? this.baseUrl : `${this.baseUrl}/?page=${page}`;
      try {
        const res = await fetch(pageUrl, {
          headers: { "User-Agent": USER_AGENT },
        });
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);

        $(".job-card").each((_, el) => {
          const card = $(el);
          const linkEl = card.find("a[href^='/job/'], a[href*='yohire.in/job/']").first();
          let href = linkEl.attr("href") || "";
          if (href && !href.startsWith("http")) {
            href = new URL(href, this.baseUrl).toString();
          }

          let title = card.find(".job-title, h2, h3").text().trim();
          if (!title) {
            title = linkEl.text().trim();
          }

          if (href && !items.some((i) => i.url === href)) {
            items.push({ url: href, title });
          }
        });
      } catch (err) {
        console.error(`Error discovering YoHire page ${page}:`, err);
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

    // Title: look for the primary heading
    let title = $("h1").last().text().trim();
    if (!title || title === "YoHire") {
      title = $("title").text().replace(/\s*\|\s*India\s*—\s*YoHire.*$/i, "").trim();
    }

    // Try extracting JSON-LD schema if present
    let schemaOrg: Record<string, any> | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || "{}");
        if (parsed["@type"] === "JobPosting") {
          schemaOrg = parsed;
        }
      } catch {
        // ignore parse error
      }
    });

    // Extract tags / badges
    const categoryTags: string[] = [];
    const schemaData: any = schemaOrg;
    if (schemaData) {
      if (schemaData.employmentType) categoryTags.push(String(schemaData.employmentType));
      if (schemaData.hiringOrganization?.name) categoryTags.push(String(schemaData.hiringOrganization.name));
      if (schemaData.jobLocation?.address?.addressLocality) {
        categoryTags.push(String(schemaData.jobLocation.address.addressLocality));
      }
    }

    // Check on-page tags / badges / metadata items
    $(".job-meta span, .job-tags span, .tag, .badge, [class*='badge']").each((_, el) => {
      const tagText = $(el).text().trim().replace(/^[📍🏢📅🔗🎯]/, "").trim();
      if (tagText && tagText.length < 40 && !categoryTags.includes(tagText)) {
        categoryTags.push(tagText);
      }
    });

    // Extract batch year from title or text if present (e.g. "2025", "2026")
    const batchMatches = title.match(/\b(202[2-7])\b/g);
    if (batchMatches) {
      for (const b of batchMatches) {
        if (!categoryTags.includes(b)) categoryTags.push(b);
      }
    }

    // Regex guesses
    const guesses = extractTitleGuesses(title);
    if (schemaData?.hiringOrganization?.name && !guesses.companyGuess) {
      guesses.companyGuess = schemaData.hiringOrganization.name;
    }
    if (schemaData?.jobLocation?.address?.addressLocality && !guesses.cityGuess) {
      guesses.cityGuess = schemaData.jobLocation.address.addressLocality;
    }

    // Extract main text/html for body
    const bodyEl = $("main, article, .job-details, .content").first();
    const rawHtml = bodyEl.length > 0 ? bodyEl.html() || html : html;

    // Extract apply URL — prefer JSON-LD directApply URL, fall back to intelligent scoring
    let applyUrl: string | undefined;
    if (schemaData?.url) {
      applyUrl = String(schemaData.url);
    }
    if (!applyUrl || applyUrl.includes("yohire.in")) {
      applyUrl = extractBestApplyUrl(rawHtml, url, guesses.companyGuess);
    }

    return {
      title,
      html: rawHtml,
      categoryTags,
      companyGuess: guesses.companyGuess,
      roleGuess: guesses.roleGuess,
      cityGuess: guesses.cityGuess,
      applyUrl,
    };
  }
}
