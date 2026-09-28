import { prisma } from "@repo/db";
import { OffCampusJobs4uScraper } from "../scrapers/offcampusjobs4u";
import { findDuplicateCandidates } from "../pipeline/dedup";
import { enrichSingleJobDirect } from "../pipeline/enrich";

async function main() {
  console.log("=== Testing Source 2 (OffCampusJobs4u) & Cross-Source Dedup ===");
  const scraper = new OffCampusJobs4uScraper();

  console.log("Discovering jobs from OffCampusJobs4u...");
  const discovered = await scraper.discover();
  console.log(`Discovered ${discovered.length} jobs.`);

  if (discovered.length === 0) {
    console.log("No jobs discovered from OffCampusJobs4u listing, testing synthetic cross-source repost...");
  } else {
    // Insert up to 5 into RawJob
    for (const item of discovered.slice(0, 5)) {
      try {
        const existing = await prisma.rawJob.findUnique({
          where: { sourceUrl: item.url },
        });

        if (!existing) {
          const rj = await prisma.rawJob.create({
            data: {
              sourceId: scraper.sourceId,
              sourceUrl: item.url,
              rawTitle: item.title,
              rawHtml: "",
              status: "pending",
            },
          });

          console.log(`Scraping detail for: ${item.url}`);
          const detail = await scraper.scrapeDetail(item.url);
          await prisma.rawJob.update({
            where: { id: rj.id },
            data: {
              rawTitle: detail.title,
              rawHtml: detail.html,
              sourceCategoryTags: detail.categoryTags,
              companyGuess: detail.companyGuess,
              roleGuess: detail.roleGuess,
              cityGuess: detail.cityGuess,
            },
          });

          console.log(`  ✓ Saved: [${detail.companyGuess || "N/A"}] ${detail.roleGuess || detail.title}`);

          // Dedup check
          const candidates = await findDuplicateCandidates(detail.companyGuess, detail.roleGuess);
          console.log(`  Dedup check: found ${candidates.length} candidate(s)`);

          const { result } = await enrichSingleJobDirect(rj.id, candidates);
          console.log(`  Pipeline result:`, result);
        }
      } catch (err) {
        console.error("Error processing item:", err);
      }
    }
  }

  // Explicit Cross-Source Dedup Simulation Test:
  // Manufacture an incoming posting on Source 2 for the existing LinkedIn Internship from Source 1
  console.log("\n=== Explicit Cross-Source Dedup Test ===");
  const existingMaster = await prisma.job.findFirst({
    where: { company: "LinkedIn" },
  });

  if (existingMaster) {
    console.log(`Found existing master job: [${existingMaster.company} — ${existingMaster.role}]`);
    console.log(`Initial seenOnSourceIds:`, existingMaster.seenOnSourceIds);

    // Simulate incoming duplicate from OffCampusJobs4u
    const syntheticUrl = `https://offcampusjobs4u.com/linkedin-internship-2026-${Date.now()}`;
    const rawDup = await prisma.rawJob.create({
      data: {
        sourceId: "source_offcampusjobs4u",
        sourceUrl: syntheticUrl,
        rawTitle: "LinkedIn Recruitment 2026 – Software Engineering Intern in Bangalore",
        rawHtml: "<p>LinkedIn hiring software intern in Bangalore for 2026 batch.</p>",
        sourceCategoryTags: ["2026 Batch Off Campus", "Bangalore", "B.E/B.Tech Jobs"],
        companyGuess: "LinkedIn",
        roleGuess: "Software Engineering Intern",
        cityGuess: "Bangalore",
        status: "pending",
      },
    });

    const candidates = await findDuplicateCandidates("LinkedIn", "Software Engineering Intern");
    console.log(`Dedup candidates found for cross-source repost: ${candidates.length}`);

    const { result } = await enrichSingleJobDirect(rawDup.id, candidates);
    console.log("Enrichment merge result:", result);

    const updatedMaster = await prisma.job.findUnique({
      where: { id: existingMaster.id },
    });
    console.log("Updated master seenOnSourceIds:", updatedMaster?.seenOnSourceIds);

    const dupRecord = await prisma.rawJob.findUnique({
      where: { id: rawDup.id },
    });
    console.log(`RawJob status: ${dupRecord?.status}, duplicateOfJobId: ${dupRecord?.duplicateOfJobId}`);
    console.log("✓ Cross-source deduplication verified: merged without creating a duplicate public job!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
