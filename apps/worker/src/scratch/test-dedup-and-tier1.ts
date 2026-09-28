import { prisma } from "@repo/db";
import { findDuplicateCandidates } from "../pipeline/dedup";
import { mapTagsTier1 } from "../pipeline/categorize";
import { normalizeCompanyName, normalizeRoleTitle } from "@repo/shared";

async function main() {
  console.log("=== Testing Step 5: Tier 1 Category Alias Lookup ===");
  const rawJobs = await prisma.rawJob.findMany({
    where: { sourceId: "source_yohire", rawHtml: { not: "" } },
    take: 5,
  });

  for (const rj of rawJobs) {
    const res = await mapTagsTier1("source_yohire", rj.sourceCategoryTags);
    console.log(`Job: ${rj.rawTitle.slice(0, 50)}...`);
    console.log(`  Raw tags:`, rj.sourceCategoryTags);
    console.log(`  Tier 1 Mapped: batch=${JSON.stringify(res.batchYears)}, city=${JSON.stringify(res.city)}, confidence=${res.confidence}`);
  }

  console.log("\n=== Testing Step 4: Stage A Dedup Query ===");
  // Create a manufactured Job in DB
  const testJob = await prisma.job.create({
    data: {
      company: "LinkedIn",
      companyNormalized: normalizeCompanyName("LinkedIn"),
      role: "Software Engineering Intern",
      roleNormalized: normalizeRoleTitle("Software Engineering Intern"),
      slug: `test-linkedin-intern-${Date.now()}`,
      description: "Test job description for deduplication verification",
      batchYears: ["2026"],
      degree: ["B.E/B.Tech"],
      city: ["Bangalore"],
      jobType: "internship",
      applyUrl: "https://linkedin.com/jobs/123",
      status: "published",
    },
  });

  console.log(`Created test Job: id=${testJob.id}, companyNormalized='${testJob.companyNormalized}', roleNormalized='${testJob.roleNormalized}'`);

  // 1. Repost matching LinkedIn / Software Engineer Intern
  console.log("\nTest 1: Searching for manufactured repost [LinkedIn / Software Engineer Intern]...");
  const candidates1 = await findDuplicateCandidates("LinkedIn India", "Software Engineering Intern 2026");
  console.log(`  Candidates found: ${candidates1.length}`);
  if (candidates1.length > 0) {
    console.log(`  ✓ Successfully caught duplicate! Matched:`, candidates1[0]);
  } else {
    console.error("  ✗ Failed to find duplicate!");
  }

  // 2. Unrelated job (should NOT match)
  console.log("\nTest 2: Searching for unrelated job [Google / Product Manager]...");
  const candidates2 = await findDuplicateCandidates("Google LLC", "Product Manager");
  console.log(`  Candidates found: ${candidates2.length}`);
  if (candidates2.length === 0) {
    console.log("  ✓ Correctly returned 0 candidates for unrelated job!");
  } else {
    console.error("  ✗ Unexpected candidates found:", candidates2);
  }

  // Clean up test job
  await prisma.job.delete({ where: { id: testJob.id } });
  console.log("\nCleaned up test Job.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
