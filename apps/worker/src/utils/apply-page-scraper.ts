import * as cheerio from "cheerio";
import { USER_AGENT } from "./user-agent";
import { BLACKLISTED_DOMAINS, ATS_DOMAINS } from "./apply-url-extractor";

// Per-domain rate limiting to be respectful to company servers
const domainLastFetch: Map<string, number> = new Map();
const APPLY_PAGE_RATE_LIMIT_MS = 4000; // 4s between requests to same domain

export interface ApplyPageResult {
  descriptionText: string;  // cleaned plain text from the apply page
  pageTitle: string;
  platform: string | null;  // detected ATS platform name
  success: boolean;
  failureReason?: string;
}

/**
 * Domains that should never be scraped for apply-page descriptions
 * (social, shorteners, our own aggregator sources, etc.)
 */
const SKIP_SCRAPE_DOMAINS = [
  ...BLACKLISTED_DOMAINS,
  // Login-walled / JS-heavy platforms that won't yield useful content via fetch
  "linkedin.com",
  "naukri.com",
  "indeed.com",
  "glassdoor.com",
  "monster.com",
  "shine.com",
  "foundit.in",
  "hirist.com",
  "iimjobs.com",
  "apna.co",
];

/**
 * ATS platform detection patterns and their corresponding selectors.
 * Ordered by specificity — first match wins.
 */
interface ATSProfile {
  name: string;
  /** Returns true if the URL or HTML belongs to this ATS */
  detect: (url: string, host: string, html: string) => boolean;
  /** CSS selectors to extract the job description, tried in order */
  selectors: string[];
}

const ATS_PROFILES: ATSProfile[] = [
  {
    name: "Workday",
    detect: (url, host) =>
      host.includes("myworkdayjobs.com") || (host.includes("wd") && url.includes("workday")),
    selectors: [
      '[data-automation-id="jobPostingDescription"]',
      ".job-description",
      '[class*="jobDescription"]',
      ".css-cygeeu",
    ],
  },
  {
    name: "Greenhouse",
    detect: (url, host) =>
      host.includes("greenhouse.io") || host.includes("boards.greenhouse"),
    selectors: [
      "#content .job-post",
      ".content .body",
      "#app_body .content",
      ".job-post__content",
    ],
  },
  {
    name: "Lever",
    detect: (url, host) =>
      host.includes("lever.co") || host.includes("jobs.lever"),
    selectors: [
      ".posting-page .content",
      ".section-wrapper .content",
      '[class*="posting-"]',
      ".posting-headline + div",
    ],
  },
  {
    name: "SmartRecruiters",
    detect: (url, host) =>
      host.includes("smartrecruiters.com") || host.includes("jobs.smartrecruiters"),
    selectors: [
      ".job-description",
      ".jobAd",
      '[class*="jobDescription"]',
      ".job-sections",
    ],
  },
  {
    name: "Eightfold",
    detect: (url, host) =>
      host.includes("eightfold.ai"),
    selectors: [
      ".position-job-description",
      '[class*="job-description"]',
      ".position-details",
    ],
  },
  {
    name: "iCIMS",
    detect: (url, host) =>
      host.includes("icims.com"),
    selectors: [
      ".iCIMS_JobContent",
      ".iCIMS_MainWrapper",
      '[class*="JobContent"]',
    ],
  },
  {
    name: "Darwinbox",
    detect: (url, host) =>
      host.includes("darwinbox.in") || host.includes("darwinbox.io"),
    selectors: [
      ".job-description",
      ".job-details-content",
      '[class*="jobDescription"]',
    ],
  },
  {
    name: "SuccessFactors",
    detect: (url, host) =>
      host.includes("successfactors.com") || host.includes("successfactors.eu"),
    selectors: [
      ".jobDescription",
      "#jobDescriptionContent",
      '[class*="description"]',
    ],
  },
  {
    name: "Taleo",
    detect: (url, host) =>
      host.includes("taleo.net"),
    selectors: [
      ".job-description",
      "#requisitionDescriptionInterface",
      '[class*="Description"]',
    ],
  },
];

/**
 * Applies per-domain rate limiting to be respectful to company career servers.
 */
async function rateLimitDomain(host: string): Promise<void> {
  const lastFetch = domainLastFetch.get(host);
  if (lastFetch) {
    const elapsed = Date.now() - lastFetch;
    if (elapsed < APPLY_PAGE_RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, APPLY_PAGE_RATE_LIMIT_MS - elapsed));
    }
  }
  domainLastFetch.set(host, Date.now());
}

/**
 * Checks if a URL should be skipped for apply-page scraping.
 */
function shouldSkipUrl(url: string): { skip: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (SKIP_SCRAPE_DOMAINS.some((d) => host === d || host.endsWith("." + d))) {
      return { skip: true, reason: `Domain ${host} is in skip list` };
    }

    // Skip non-HTTP URLs
    if (!parsed.protocol.startsWith("http")) {
      return { skip: true, reason: "Non-HTTP URL" };
    }

    // Skip if it looks like a generic fallback
    if (url.includes("careers.example.com")) {
      return { skip: true, reason: "Placeholder URL" };
    }

    return { skip: false };
  } catch {
    return { skip: true, reason: "Invalid URL" };
  }
}

/**
 * Detects which ATS platform a page belongs to.
 */
function detectPlatform(url: string, host: string, html: string): ATSProfile | null {
  for (const profile of ATS_PROFILES) {
    if (profile.detect(url, host, html)) {
      return profile;
    }
  }
  return null;
}

/**
 * Generic selectors for career pages that don't match any known ATS.
 * Tried in order of specificity.
 */
const GENERIC_JOB_SELECTORS = [
  ".job-description",
  '[class*="job-description"]',
  '[class*="jobDescription"]',
  '[class*="job-detail"]',
  '[class*="jobDetail"]',
  '[id*="job-description"]',
  '[id*="jobDescription"]',
  ".career-detail",
  '[class*="career"]',
  '[class*="posting"]',
  "article",
  "main",
  '[role="main"]',
  ".content",
  "#content",
];

/**
 * Cleans extracted HTML into readable plain text.
 * Strips boilerplate, navigation, footers, and normalizes whitespace.
 */
function cleanExtractedHtml($: cheerio.CheerioAPI, rootEl: cheerio.Cheerio<any>): string {
  const clone = rootEl.clone();
  const $clone = cheerio.load(clone.html() || "");

  // Remove non-content elements
  $clone(
    "script, style, iframe, nav, footer, header, noscript, " +
    ".sidebar, .nav, .footer, .header, .navigation, .menu, " +
    ".social-share, .share-buttons, .apply-button, .apply-btn, " +
    ".breadcrumb, .breadcrumbs, .cookie-banner, .cookie-consent, " +
    '[class*="sidebar"], [class*="navigation"], [class*="footer"], ' +
    '[class*="cookie"], [class*="banner"], [class*="popup"], ' +
    '[class*="modal"], [class*="social"], [class*="share"]'
  ).remove();

  let text = $clone.root().text();

  // Normalize whitespace
  text = text
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
}

/**
 * Main function: Scrapes the job description from a company's actual careers/apply page.
 *
 * This is "Source B" in the dual-source pipeline — fetches the apply URL,
 * detects the ATS platform, and extracts the job description text.
 *
 * Returns success=false if the page can't be scraped, so the pipeline
 * can gracefully fall back to aggregator-only.
 */
export async function scrapeApplyPage(applyUrl: string): Promise<ApplyPageResult> {
  // 1. Pre-flight checks
  const skipCheck = shouldSkipUrl(applyUrl);
  if (skipCheck.skip) {
    return {
      descriptionText: "",
      pageTitle: "",
      platform: null,
      success: false,
      failureReason: skipCheck.reason,
    };
  }

  let host: string;
  try {
    host = new URL(applyUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return {
      descriptionText: "",
      pageTitle: "",
      platform: null,
      success: false,
      failureReason: "Invalid URL",
    };
  }

  // 2. Rate limit per domain
  await rateLimitDomain(host);

  // 3. Fetch the page
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(applyUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        descriptionText: "",
        pageTitle: "",
        platform: null,
        success: false,
        failureReason: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        descriptionText: "",
        pageTitle: "",
        platform: null,
        success: false,
        failureReason: `Non-HTML content type: ${contentType}`,
      };
    }

    html = await res.text();
  } catch (err: any) {
    return {
      descriptionText: "",
      pageTitle: "",
      platform: null,
      success: false,
      failureReason: err.name === "AbortError" ? "Request timeout (15s)" : `Fetch error: ${err.message}`,
    };
  }

  // 4. Parse and extract
  const $ = cheerio.load(html);
  const pageTitle = $("title").text().trim();

  const platform = detectPlatform(applyUrl, host, html);
  const platformName = platform?.name || null;

  const selectorsToTry = platform
    ? [...platform.selectors, ...GENERIC_JOB_SELECTORS]
    : GENERIC_JOB_SELECTORS;

  let bestText = "";
  let bestLength = 0;

  for (const selector of selectorsToTry) {
    try {
      const el = $(selector).first();
      if (el.length > 0) {
        const cleaned = cleanExtractedHtml($, el);
        if (cleaned.length > 100 && cleaned.length > bestLength) {
          bestText = cleaned;
          bestLength = cleaned.length;
          if (bestLength > 300) break;
        }
      }
    } catch {
      // Selector might be invalid, skip
    }
  }

  // 5. Validate result
  if (bestText.length < 80) {
    const bodyText = cleanExtractedHtml($, $("body"));
    if (bodyText.length > 200) {
      bestText = bodyText.slice(0, 5000);
    } else {
      return {
        descriptionText: "",
        pageTitle,
        platform: platformName,
        success: false,
        failureReason: "No substantive job description content found on page",
      };
    }
  }

  // Cap at reasonable length
  if (bestText.length > 8000) {
    bestText = bestText.slice(0, 8000);
  }

  return {
    descriptionText: bestText,
    pageTitle,
    platform: platformName,
    success: true,
  };
}
