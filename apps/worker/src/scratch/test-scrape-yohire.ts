import { prisma } from "@repo/db";
import { YoHireScraper } from "../scrapers/yohire";

async function main() {
  console.log("=== Testing YoHire Scraper ===");
  const scraper = new YoHireScraper();

  // 1. Discovery
  console.log("Discovering jobs from YoHire...");
  const discovered = await scraper.discover();
  console.log(`Discovered ${discovered.length} jobs.`);

  if (discovered.length === 0) {
    console.error("No jobs discovered!");
    return;
  }

  // Create ScrapeRun record
  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      sourceId: scraper.sourceId,
      status: "running",
      jobsFound: discovered.length,
    },
  });

  let newJobsCount = 0;

  // Insert into RawJob
  for (const item of discovered) {
    try {
      const existing = await prisma.rawJob.findUnique({
        where: { sourceUrl: item.url },
      });

      if (!existing) {
        await prisma.rawJob.create({
          data: {
            sourceId: scraper.sourceId,
            sourceUrl: item.url,
            rawTitle: item.title,
            rawHtml: "", // will be filled in detail scrape
            status: "pending",
          },
        });
        newJobsCount++;
      }
    } catch (err) {
      console.error(`Error inserting raw job ${item.url}:`, err);
    }
  }

  console.log(`Inserted ${newJobsCount} new RawJob records.`);

  // 2. Detail scrape for up to 10 pending jobs
  const pendingJobs = await prisma.rawJob.findMany({
    where: { sourceId: scraper.sourceId, status: "pending" },
    take: 10,
  });

  console.log(`Scraping details for ${pendingJobs.length} jobs...`);

  for (const rj of pendingJobs) {
    try {
      console.log(`Scraping detail: ${rj.sourceUrl}`);
      const detail = await scraper.scrapeDetail(rj.sourceUrl);

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

      console.log(`  ✓ Saved: [${detail.companyGuess || "N/A"}] ${detail.roleGuess || detail.title} in ${detail.cityGuess || "N/A"}`);
      console.log(`    Tags:`, detail.categoryTags);
    } catch (err) {
      console.error(`  ✗ Error scraping detail for ${rj.sourceUrl}:`, err);
    }
  }

  await prisma.scrapeRun.update({
    where: { id: scrapeRun.id },
    data: {
      status: "success",
      finishedAt: new Date(),
      jobsNew: newJobsCount,
    },
  });

  // Verify records in DB
  const count = await prisma.rawJob.count({
    where: { sourceId: scraper.sourceId },
  });
  console.log(`\nTotal RawJob records in DB for YoHire: ${count}`);

  const sample = await prisma.rawJob.findMany({
    where: { sourceId: scraper.sourceId },
    take: 5,
    select: {
      id: true,
      rawTitle: true,
      companyGuess: true,
      roleGuess: true,
      cityGuess: true,
      sourceCategoryTags: true,
    },
  });

  console.log("\nSample scraped jobs in DB:");
  console.table(sample);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
