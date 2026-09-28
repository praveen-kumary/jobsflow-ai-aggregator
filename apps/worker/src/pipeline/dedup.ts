import { prisma } from "@repo/db";
import { normalizeCompanyName, normalizeRoleTitle } from "@repo/shared";
import { DuplicateCandidate } from "@repo/shared";

/**
 * Stage A — SQL Trigram Pre-filter (zero LLM cost)
 * Finds existing Job records within the last 30 days matching normalized company (>0.6) and role (>0.5)
 */
export async function findDuplicateCandidates(
  companyGuess?: string | null,
  roleGuess?: string | null
): Promise<DuplicateCandidate[]> {
  if (!companyGuess || !roleGuess) {
    return [];
  }

  const normCompany = normalizeCompanyName(companyGuess);
  const normRole = normalizeRoleTitle(roleGuess);

  // If normalized strings are too short or empty, skip pre-filter
  if (normCompany.length < 2 || normRole.length < 2) {
    return [];
  }

  try {
    const candidates: Array<{
      id: string;
      company: string;
      role: string;
      city: string[];
      batchYears: string[];
      description: string;
      company_sim: number;
      role_sim: number;
    }> = await prisma.$queryRaw`
      SELECT 
        id, 
        company, 
        role, 
        city, 
        "batchYears", 
        description,
        similarity("companyNormalized", ${normCompany}) as company_sim,
        similarity("roleNormalized", ${normRole}) as role_sim
      FROM "Job"
      WHERE similarity("companyNormalized", ${normCompany}) > 0.6
        AND similarity("roleNormalized", ${normRole}) > 0.5
        AND "createdAt" > now() - interval '30 days'
      ORDER BY similarity("companyNormalized", ${normCompany}) DESC
      LIMIT 5;
    `;

    return candidates.map((c) => ({
      id: c.id,
      company: c.company,
      role: c.role,
      city: c.city,
      batchYears: c.batchYears,
      descriptionSnippet: c.description ? c.description.slice(0, 200) : undefined,
    }));
  } catch (error) {
    console.error("Error executing Stage A dedup query:", error);
    return [];
  }
}
