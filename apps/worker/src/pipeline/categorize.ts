import { prisma } from "@repo/db";

export interface Tier1CategorizationResult {
  batchYears: string[];
  degree: string[];
  city: string[];
  jobType: string | null;
  functionalArea: string | null;
  unmappedTags: string[];
  confidence: "high" | "low" | "needs_review";
}

/**
 * Tier 1 — Category Alias Table Lookup (Deterministic, 0 LLM cost)
 * Maps source raw category tags to canonical taxonomy values using CategoryAlias records.
 */
export async function mapTagsTier1(
  sourceId: string,
  rawTags: string[]
): Promise<Tier1CategorizationResult> {
  if (!rawTags || rawTags.length === 0) {
    return {
      batchYears: [],
      degree: [],
      city: [],
      jobType: null,
      functionalArea: null,
      unmappedTags: [],
      confidence: "needs_review",
    };
  }

  // Fetch all active aliases for this source
  const aliases = await prisma.categoryAlias.findMany({
    where: { sourceId },
  });

  // Create a lookup map: normalized rawValue -> array of aliases
  const aliasMap = new Map<string, typeof aliases>();
  for (const a of aliases) {
    const key = a.rawValue.toLowerCase().trim();
    if (!aliasMap.has(key)) {
      aliasMap.set(key, []);
    }
    aliasMap.get(key)!.push(a);
  }

  const batchYears = new Set<string>();
  const degree = new Set<string>();
  const city = new Set<string>();
  let jobType: string | null = null;
  let functionalArea: string | null = null;
  const unmappedTags: string[] = [];

  for (const rawTag of rawTags) {
    const norm = rawTag.toLowerCase().trim();
    const matchedAliases = aliasMap.get(norm);

    if (matchedAliases && matchedAliases.length > 0) {
      for (const m of matchedAliases) {
        switch (m.canonicalType) {
          case "batchYear":
            batchYears.add(m.canonicalValue);
            break;
          case "degree":
            degree.add(m.canonicalValue);
            break;
          case "city":
            city.add(m.canonicalValue);
            break;
          case "jobType":
            if (!jobType) jobType = m.canonicalValue;
            break;
          case "functionalArea":
            if (!functionalArea) functionalArea = m.canonicalValue;
            break;
        }
      }
    } else {
      unmappedTags.push(rawTag);
    }
  }

  // Confidence calculation:
  // If we have at least batchYear or city or degree mapped, and no obvious conflict
  let confidence: "high" | "low" | "needs_review" = "high";
  if (batchYears.size === 0 && city.size === 0) {
    confidence = "needs_review";
  }

  return {
    batchYears: Array.from(batchYears),
    degree: Array.from(degree),
    city: Array.from(city),
    jobType,
    functionalArea,
    unmappedTags,
    confidence,
  };
}
