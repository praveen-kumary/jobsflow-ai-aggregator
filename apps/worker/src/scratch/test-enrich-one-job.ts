import { prisma } from "@repo/db";
import { findDuplicateCandidates } from "../pipeline/dedup";
import { enrichSingleJobDirect } from "../pipeline/enrich";

async function main() {
  console.log("=== Step 6: Testing End-to-End Enrichment for ONE Job ===");

  // Find a pending RawJob with non-empty rawHtml
  const rawJob = await prisma.rawJob.findFirst({
    where: { sourceId: "source_yohire", rawHtml: { not: "" }, status: "pending" },
  });

  if (!rawJob) {
    console.error("No pending RawJob with rawHtml found!");
    return;
  }

  console.log(`Processing RawJob: [${rawJob.id}]`);
  console.log(`Title: ${rawJob.rawTitle}`);
  console.log(`Company Guess: ${rawJob.companyGuess}`);
  console.log(`Role Guess: ${rawJob.roleGuess}`);
  console.log(`City Guess: ${rawJob.cityGuess}`);

  // Stage A Dedup Check
  console.log("\n1. Running Stage A Dedup Check...");
  const candidates = await findDuplicateCandidates(rawJob.companyGuess, rawJob.roleGuess);
  console.log(`Found ${candidates.length} duplicate candidates.`);

  // Enrichment
  console.log("\n2. Running Enrichment (Extraction + Categorization + Clean Description)...");
  const { parsed, result } = await enrichSingleJobDirect(rawJob.id, candidates);

  console.log("\nEnrichment Parsed Output:");
  console.log({
    company: parsed.company,
    role: parsed.role,
    batch_years: parsed.batch_years,
    degree: parsed.degree,
    city: parsed.city,
    job_type: parsed.job_type,
    functional_area: parsed.functional_area,
    apply_url: parsed.apply_url,
  });

  console.log("\nResult Action:", result);

  if (result.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: result.jobId },
    });
    console.log("\nCreated Job in Database:");
    console.log({
      id: job?.id,
      company: job?.company,
      role: job?.role,
      city: job?.city,
      batchYears: job?.batchYears,
      categoryConfidence: job?.categoryConfidence,
      status: job?.status,
      slug: job?.slug,
      applyUrl: job?.applyUrl,
    });
    console.log("\nClean Description Preview:\n" + job?.description.slice(0, 300) + "...\n");
  }

  console.log("✓ Step 6 completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
