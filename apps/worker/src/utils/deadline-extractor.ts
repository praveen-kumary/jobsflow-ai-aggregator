import * as cheerio from "cheerio";

// Month dictionary for parsing text dates
const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Extracts explicit job application deadline from HTML if present.
 * Returns ISO string YYYY-MM-DD or null if rolling/unspecified.
 */
export function extractDeadline(rawHtml: string): string | null {
  if (!rawHtml) return null;

  try {
    const $ = cheerio.load(rawHtml);

    // 1. JSON-LD validThrough
    let jsonLdDate: string | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html() || "";
        const data = JSON.parse(text);
        if (data["@type"] === "JobPosting" && data.validThrough) {
          const d = new Date(data.validThrough);
          if (!isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2030) {
            jsonLdDate = d.toISOString().split("T")[0];
          }
        }
      } catch {}
    });

    if (jsonLdDate) return jsonLdDate;

    // 2. Scan meta tags
    const metaValidThrough = $('meta[itemprop="validThrough"]').attr("content");
    if (metaValidThrough) {
      const d = new Date(metaValidThrough);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }

    // 3. Scan HTML text context for deadline keywords
    // Look for table cells, list items, or paragraphs with "Last Date", "Deadline", etc.
    const candidates: string[] = [];

    $("tr, li, p, div").each((_, el) => {
      const line = $(el).text().replace(/\s+/g, " ").trim();
      if (line.length > 100) return; // ignore long paragraphs

      const match = line.match(/(?:last\s*date(?:\s*to\s*apply)?|apply\s*before|application\s*deadline|registration\s*(?:ends?|closes?|deadline)|closing\s*date|valid\s*until|expiry\s*date)[:\s-]+([A-Za-z0-9\s,/-]{5,35})/i);
      if (match) {
        const value = match[1].trim();
        // Ignore "ASAP", "Not specified", "Immediately", "Rolling"
        if (/asap|immediately|rolling|not\s*(?:specified|mentioned|disclosed)|soon/i.test(value)) {
          return;
        }
        candidates.push(value);
      }
    });

    for (const rawDate of candidates) {
      const parsed = parseDateString(rawDate);
      if (parsed) return parsed;
    }
  } catch {}

  return null;
}

/**
 * Parses flexible date string formats into YYYY-MM-DD
 */
function parseDateString(str: string): string | null {
  // Format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/\b(202[4-9])[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](202[4-9])\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Format: DD Month YYYY (e.g. 15th October 2026, 30 Sep 2026)
  const textMatch1 = str.match(/\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(202[4-9])\b/i);
  if (textMatch1) {
    const d = textMatch1[1].padStart(2, "0");
    const monthName = textMatch1[2].toLowerCase();
    const y = textMatch1[3];
    const mNum = MONTHS[monthName];
    if (mNum) {
      const m = String(mNum).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Format: Month DD, YYYY (e.g. October 15, 2026)
  const textMatch2 = str.match(/\b([A-Za-z]+)\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(202[4-9])\b/i);
  if (textMatch2) {
    const monthName = textMatch2[1].toLowerCase();
    const d = textMatch2[2].padStart(2, "0");
    const y = textMatch2[3];
    const mNum = MONTHS[monthName];
    if (mNum) {
      const m = String(mNum).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Standard Date fallback
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2030) {
    return d.toISOString().split("T")[0];
  }

  return null;
}
