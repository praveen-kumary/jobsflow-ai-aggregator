import { prisma } from "@repo/db";
import { IScraper } from "../scrapers/base";
import { YoHireScraper } from "../scrapers/yohire";
import { OffCampusJobs4uScraper } from "../scrapers/offcampusjobs4u";
import { FreshersHuntScraper } from "../scrapers/freshershunt";
import { FreshersTechScraper } from "../scrapers/fresherstech";
import { JobsNetScraper } from "../scrapers/jobsnet";
import { findDuplicateCandidates } from "./dedup";
import { enrichSingleJobDirect } from "./enrich";
import { extractBestApplyUrl } from "../utils/apply-url-extractor";
import { scrapeApplyPage } from "../utils/apply-page-scraper";

export const SCRAPER_REGISTRY: Record<string, () => IScraper> = {
  source_yohire: () => new YoHireScraper(),
  source_offcampusjobs4u: () => new OffCampusJobs4uScraper(),
  source_freshershunt: () => new FreshersHuntScraper(),
  source_fresherstech: () => new FreshersTechScraper(),
  source_jobsnet: () => new JobsNetScraper(),
};

export interface ScrapeRunStats {
  sourceId: string;
  sourceName: string;
  discoveredCount: number;
  newRawJobsInserted: number;
  newJobsCreated: number;
  duplicatesMerged: number;
  skippedAlreadySeen: number;
}

/**
 * Runs the scraper for a specific source, correctly figuring out NEW JOBS ONLY
 */
export async function runScraperForSource(
  sourceId: string,
  maxDetailsToScrape: number = 5
): Promise<ScrapeRunStats> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source || !source.isActive) {
    throw new Error(`Source ${sourceId} not found or inactive`);
  }

  const scraperFactory = SCRAPER_REGISTRY[sourceId];
  if (!scraperFactory) {
    throw new Error(`No scraper implemented for source: ${sourceId}`);
  }

  const scraper = scraperFactory();
  console.log(`\n========================================`);
  console.log(`Starting Scrape Run: [${source.name}]`);
  console.log(`========================================`);

  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      sourceId,
      status: "running",
      jobsFound: 0,
      jobsNew: 0,
    },
  });

  const stats: ScrapeRunStats = {
    sourceId,
    sourceName: source.name,
    discoveredCount: 0,
    newRawJobsInserted: 0,
    newJobsCreated: 0,
    duplicatesMerged: 0,
    skippedAlreadySeen: 0,
  };

  try {
    // 1. Discovery
    console.log(`[${source.name}] Discovering candidate postings...`);
    const discovered = await scraper.discover();
    stats.discoveredCount = discovered.length;
    console.log(`[${source.name}] Discovered ${discovered.length} URLs from listing.`);

    // 2. Filter for NEW URLs only (Zero redundant scraping)
    const newlyDiscoveredRawJobIds: string[] = [];

    for (const item of discovered) {
      const existing = await prisma.rawJob.findUnique({
        where: { sourceUrl: item.url },
      });

      if (existing) {
        stats.skippedAlreadySeen++;
      } else {
        const rawJob = await prisma.rawJob.create({
          data: {
            sourceId,
            sourceUrl: item.url,
            rawTitle: item.title,
            rawHtml: "",
            status: "pending",
          },
        });
        newlyDiscoveredRawJobIds.push(rawJob.id);
        stats.newRawJobsInserted++;
      }
    }

    console.log(
      `[${source.name}] Found ${stats.newRawJobsInserted} brand new URLs (${stats.skippedAlreadySeen} previously scraped).`
    );

    // 3. Scrape Details & Process Pipeline for New URLs only
    let jobsToProcess = [...newlyDiscoveredRawJobIds];
    if (jobsToProcess.length < maxDetailsToScrape) {
      const remainingPending = await prisma.rawJob.findMany({
        where: {
          sourceId,
          status: "pending",
          rawHtml: "",
          id: { notIn: jobsToProcess },
        },
        select: { id: true },
        take: maxDetailsToScrape - jobsToProcess.length,
      });
      jobsToProcess.push(...remainingPending.map((p) => p.id));
    } else {
      jobsToProcess = jobsToProcess.slice(0, maxDetailsToScrape);
    }

    for (const rawJobId of jobsToProcess) {
      const rj = await prisma.rawJob.findUnique({ where: { id: rawJobId } });
      if (!rj) continue;

      try {
        console.log(`  -> Fetching detail for: ${rj.sourceUrl}`);
        const detail = await scraper.scrapeDetail(rj.sourceUrl);

        // Update RawJob
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

        // 4. Stage A Trigram Dedup Pre-filter
        const candidates = await findDuplicateCandidates(
          detail.companyGuess,
          detail.roleGuess
        );

        if (candidates.length > 0) {
          console.log(`     🔍 Duplicate candidates found: ${candidates.length}`);
        }

        // 5. Scrape apply page for Source B description
        const applyUrl = detail.applyUrl || extractBestApplyUrl(detail.html, rj.sourceUrl, detail.companyGuess);
        let applyPageDescription: string | undefined;
        let applyPageScraped = false;

        if (applyUrl && !applyUrl.includes("careers.example.com")) {
          console.log(`     🌐 Scraping apply page: ${applyUrl.slice(0, 80)}...`);
          try {
            const applyResult = await scrapeApplyPage(applyUrl);
            if (applyResult.success) {
              applyPageDescription = applyResult.descriptionText;
              applyPageScraped = true;
              const platform = applyResult.platform ? ` [${applyResult.platform}]` : "";
              console.log(`     ✅ Apply page scraped${platform}: ${applyResult.descriptionText.length} chars`);
            } else {
              console.log(`     ⚠️  Apply page not scraped: ${applyResult.failureReason}`);
            }
          } catch (applyErr: any) {
            console.log(`     ⚠️  Apply page scrape error: ${applyErr.message}`);
          }
        }

        // 6. Enrichment & Creation / Merge (with dual-source descriptions)
        const { result } = await enrichSingleJobDirect(
          rj.id,
          candidates,
          applyPageDescription,
          applyPageScraped
        );

        if (result.action === "merged_duplicate") {
          console.log(`     🔁 MERGED duplicate into existing job [${result.jobId}]`);
          stats.duplicatesMerged++;
        } else if (result.action === "created_job") {
          console.log(`     ✨ CREATED new job draft [${result.jobId}]`);
          stats.newJobsCreated++;
        }
      } catch (detailErr) {
        console.error(`     ✗ Error scraping detail:`, detailErr);
      }
    }

    // Update Source & ScrapeRun
    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        jobsFound: stats.discoveredCount,
        jobsNew: stats.newJobsCreated,
      },
    });

    await prisma.source.update({
      where: { id: sourceId },
      data: { lastScrapedAt: new Date() },
    });

    console.log(`[${source.name}] Scrape Completed:`);
    console.log(`  Discovered: ${stats.discoveredCount}`);
    console.log(`  Brand New Raw URLs: ${stats.newRawJobsInserted}`);
    console.log(`  New Unique Jobs Created: ${stats.newJobsCreated}`);
    console.log(`  Duplicates Merged: ${stats.duplicatesMerged}`);
    console.log(`  Skipped (Already Scraped): ${stats.skippedAlreadySeen}`);

    return stats;
  } catch (err: any) {
    console.error(`[${source.name}] Scrape Failed:`, err);
    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMsg: err.message,
      },
    });
    throw err;
  }
}

/**
 * Runs across ALL active sources in the database sequentially
 */
export async function runAllActiveScrapers(maxDetailsPerSource: number = 3): Promise<ScrapeRunStats[]> {
  const activeSources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const results: ScrapeRunStats[] = [];

  for (const s of activeSources) {
    if (SCRAPER_REGISTRY[s.id]) {
      try {
        const stat = await runScraperForSource(s.id, maxDetailsPerSource);
        results.push(stat);
      } catch (err) {
        console.error(`Error running scraper for ${s.name}:`, err);
      }
    }
  }

  return results;
}

/**
 * Processes pending RawJobs from the staging backlog into canonical Job drafts
 */
export async function processPendingBacklog(
  batchSize = 10,
  sourceId?: string
): Promise<{ processedCount: number; newJobsCreated: number; duplicatesMerged: number }> {
  const pending = await prisma.rawJob.findMany({
    where: {
      status: "pending",
      ...(sourceId ? { sourceId } : {}),
    },
    take: batchSize,
  });

  let newJobsCreated = 0;
  let duplicatesMerged = 0;

  for (const rj of pending) {
    const scraperFactory = SCRAPER_REGISTRY[rj.sourceId];
    if (!scraperFactory) continue;
    const scraper = scraperFactory();

    try {
      let detailHtml = rj.rawHtml;
      let title = rj.rawTitle;
      let categoryTags = rj.sourceCategoryTags;
      let companyGuess = rj.companyGuess;
      let roleGuess = rj.roleGuess;
      let cityGuess = rj.cityGuess;

      if (!detailHtml) {
        const detail = await scraper.scrapeDetail(rj.sourceUrl);
        detailHtml = detail.html;
        title = detail.title;
        categoryTags = detail.categoryTags;
        companyGuess = detail.companyGuess || null;
        roleGuess = detail.roleGuess || null;
        cityGuess = detail.cityGuess || null;

        await prisma.rawJob.update({
          where: { id: rj.id },
          data: {
            rawTitle: title,
            rawHtml: detailHtml,
            sourceCategoryTags: categoryTags,
            companyGuess,
            roleGuess,
            cityGuess,
          },
        });
      }

      const candidates = await findDuplicateCandidates(companyGuess, roleGuess);

      // Scrape apply page for Source B description
      const applyUrl = extractBestApplyUrl(detailHtml, rj.sourceUrl, companyGuess);
      let applyPageDescription: string | undefined;
      let applyPageScraped = false;

      if (applyUrl && !applyUrl.includes("careers.example.com")) {
        try {
          const applyResult = await scrapeApplyPage(applyUrl);
          if (applyResult.success) {
            applyPageDescription = applyResult.descriptionText;
            applyPageScraped = true;
          }
        } catch {
          // Non-blocking — proceed with aggregator-only
        }
      }

      const { result } = await enrichSingleJobDirect(
        rj.id,
        candidates,
        applyPageDescription,
        applyPageScraped
      );

      if (result.action === "merged_duplicate") {
        duplicatesMerged++;
      } else if (result.action === "created_job") {
        newJobsCreated++;
      }
    } catch (err) {
      console.error(`Error processing pending raw job ${rj.id}:`, err);
    }
  }

  return {
    processedCount: pending.length,
    newJobsCreated,
    duplicatesMerged,
  };
}

