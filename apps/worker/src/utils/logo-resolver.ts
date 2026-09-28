/**
 * Company Logo Resolver
 * 
 * Tiered, cached logo resolution. Runs once per new company,
 * caches forever. Never re-resolves automatically — manual override via admin.
 * 
 * Tiers:
 *  1. Source-scraped logo (from aggregator HTML)
 *  2. logo.dev API (needs LOGO_DEV_TOKEN)
 *  3. Google Favicon service (free, no key, lower quality)
 *  4. Generated monogram (always works)
 */

import { prisma } from "@repo/db";
import { normalizeCompanyName } from "@repo/shared";
import { generateMonogramDataUri } from "./monogram-generator";

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || "";

// Domains that definitely won't resolve to a useful company site
const SKIP_DOMAIN_SUFFIXES = [
  "offcampusjobs4u.com", "freshershunt.in", "fresherstech.com",
  "jobsnet.in", "yohire.in", "telegram.me", "t.me",
  "naukri.com", "indeed.com", "linkedin.com", "glassdoor.com",
];

/**
 * Guess a domain from a company name.
 * "Tata Consultancy Services" → "tataconsultancyservices.com"
 * "HCLTech" → "hcltech.com"
 */
export function guessDomain(companyName: string): string {
  return (
    companyName
      .toLowerCase()
      .replace(/\b(pvt|private|ltd|limited|inc|incorporated|corp|corporation|llc|technologies|technology|tech|solutions|services|group|india)\b/gi, "")
      .replace(/[^a-z0-9]/g, "")
      .trim() + ".com"
  );
}

/**
 * Validate that a URL points to a real, usable image (not a tracking pixel or placeholder).
 * Checks: HTTP status, content-type, content-length > threshold.
 */
async function isValidImage(url: string, minBytes: number = 200): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "JobPortal-LogoResolver/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) return false;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return false;

    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    // Some servers don't send content-length on HEAD — do a GET fallback for those
    if (contentLength > 0 && contentLength < minBytes) return false;

    // If content-length wasn't sent, do a quick GET to verify
    if (contentLength === 0) {
      const getRes = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "JobPortal-LogoResolver/1.0" },
      });
      if (!getRes.ok) return false;
      const buffer = await getRes.arrayBuffer();
      if (buffer.byteLength < minBytes) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve company logo through tiered fallback.
 * Caches result in CompanyLogo table — never re-resolves unless forced.
 */
export async function resolveCompanyLogo(
  companyNormalized: string,
  sourceScrapedLogoUrl?: string | null,
  forceResolve: boolean = false
): Promise<{
  logoUrl: string;
  source: string;
  resolvedDomain: string | null;
}> {
  // Check cache first (unless force re-resolve)
  if (!forceResolve) {
    const existing = await prisma.companyLogo.findUnique({
      where: { companyNormalized },
    });
    if (existing) {
      return {
        logoUrl: existing.logoUrl,
        source: existing.source,
        resolvedDomain: existing.resolvedDomain,
      };
    }
  }

  // Tier 1: Source-scraped logo
  if (sourceScrapedLogoUrl && sourceScrapedLogoUrl.startsWith("http")) {
    const isSkipped = SKIP_DOMAIN_SUFFIXES.some((d) => sourceScrapedLogoUrl.includes(d));
    if (!isSkipped && await isValidImage(sourceScrapedLogoUrl)) {
      return upsertLogo(companyNormalized, sourceScrapedLogoUrl, "source_scraped", null);
    }
  }

  // Guess the domain for tiers 2-3
  const domain = guessDomain(companyNormalized);

  // Tier 2: logo.dev (only if token is configured)
  if (LOGO_DEV_TOKEN) {
    const logoDevUrl = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&size=128`;
    if (await isValidImage(logoDevUrl, 500)) {
      return upsertLogo(companyNormalized, logoDevUrl, "logo_dev", domain);
    }
  }

  // Tier 3: Google Favicon
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  if (await isValidImage(faviconUrl, 200)) {
    // Google returns a generic "globe" icon for unknown domains — check size to filter
    // The generic icon is typically very small (<500 bytes for the default globe)
    try {
      const res = await fetch(faviconUrl, { signal: AbortSignal.timeout(5000) });
      const buf = await res.arrayBuffer();
      // If the response is reasonably large, it's likely a real favicon
      if (buf.byteLength > 500) {
        return upsertLogo(companyNormalized, faviconUrl, "google_favicon", domain);
      }
    } catch {
      // Fall through
    }
  }

  // Tier 4: Generated monogram (always works)
  const monogramUri = generateMonogramDataUri(companyNormalized);
  return upsertLogo(companyNormalized, monogramUri, "generated_monogram", null);
}

/**
 * Create or update a CompanyLogo record
 */
async function upsertLogo(
  companyNormalized: string,
  logoUrl: string,
  source: string,
  resolvedDomain: string | null
): Promise<{ logoUrl: string; source: string; resolvedDomain: string | null }> {
  await prisma.companyLogo.upsert({
    where: { companyNormalized },
    create: { companyNormalized, logoUrl, source, resolvedDomain },
    update: { logoUrl, source, resolvedDomain, isVerified: false },
  });
  return { logoUrl, source, resolvedDomain };
}

/**
 * Bulk-resolve logos for all companies that don't have one yet.
 * Useful for backfilling after deploying this feature.
 */
export async function resolveAllMissingLogos(): Promise<{
  resolved: number;
  byTier: Record<string, number>;
}> {
  // Get all unique companyNormalized values from Job table
  const companies = await prisma.job.findMany({
    where: { status: { in: ["draft", "published"] } },
    select: { companyNormalized: true },
    distinct: ["companyNormalized"],
  });

  // Get existing logos
  const existingLogos = await prisma.companyLogo.findMany({
    select: { companyNormalized: true },
  });
  const existingSet = new Set(existingLogos.map((l) => l.companyNormalized));

  // Filter to only companies missing logos
  const missing = companies.filter((c) => !existingSet.has(c.companyNormalized));

  const byTier: Record<string, number> = {};
  let resolved = 0;

  for (const { companyNormalized } of missing) {
    try {
      const result = await resolveCompanyLogo(companyNormalized);
      byTier[result.source] = (byTier[result.source] || 0) + 1;
      resolved++;
      console.log(`  ✅ ${companyNormalized} → ${result.source}${result.resolvedDomain ? ` (${result.resolvedDomain})` : ""}`);
    } catch (err: any) {
      console.error(`  ❌ ${companyNormalized}: ${err.message}`);
    }
    // Small delay between resolutions to be polite to external APIs
    await new Promise((r) => setTimeout(r, 300));
  }

  return { resolved, byTier };
}

/**
 * Get logo for a company, resolving if needed.
 * This is the main entry point for website display.
 */
export async function getCompanyLogo(companyNormalized: string): Promise<{
  logoUrl: string;
  source: string;
  isVerified: boolean;
}> {
  const existing = await prisma.companyLogo.findUnique({
    where: { companyNormalized },
  });

  if (existing) {
    return {
      logoUrl: existing.logoUrl,
      source: existing.source,
      isVerified: existing.isVerified,
    };
  }

  // Auto-resolve on first access
  const result = await resolveCompanyLogo(companyNormalized);
  return {
    logoUrl: result.logoUrl,
    source: result.source,
    isVerified: false,
  };
}
