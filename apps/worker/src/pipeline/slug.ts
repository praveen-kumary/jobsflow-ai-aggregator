import { normalizeText } from "@repo/shared";

/**
 * Generates a clean URL slug for a job
 * Format: company-role-city-suffix
 * Uses 8-char random suffix to reduce collision risk at scale
 */
export function generateJobSlug(company: string, role: string, city?: string[]): string {
  const comp = normalizeText(company).replace(/\s+/g, "-").slice(0, 30);
  const rol = normalizeText(role).replace(/\s+/g, "-").slice(0, 30);
  const cit = city && city.length > 0 ? normalizeText(city[0]).replace(/\s+/g, "-").slice(0, 15) : "";

  const baseParts = [comp, rol, cit].filter((p) => p.length > 0);
  const base = baseParts.join("-").slice(0, 70);
  const rand = Math.random().toString(36).substring(2, 10);

  return `${base}-${rand}`;
}
