/**
 * Normalizes text (company name, role title) for fuzzy deduplication matching.
 * Converts to lowercase, strips punctuation and special characters, collapses multiple spaces.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // remove punctuation, symbols, brackets, quotes, dashes, etc.
    .replace(/[^a-z0-9\s]/g, " ")
    // collapse multiple whitespaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes company name specifically, stripping common legal suffixes like Ltd, Pvt Ltd, Inc, LLC
 */
export function normalizeCompanyName(company: string): string {
  const basic = normalizeText(company);
  return basic
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|corp|corporation|llc|technologies|technology|tech|solutions|services|group|india)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes role title, stripping common noise words like hiring, off campus, recruitment, 2024, 2025, 2026
 */
export function normalizeRoleTitle(role: string): string {
  const basic = normalizeText(role);
  return basic
    .replace(/\b(hiring|recruitment|drive|off campus|internship|intern|fresher|freshers|for|at|in|batch|apply now)\b/g, "")
    .replace(/\b(202[0-9])\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
