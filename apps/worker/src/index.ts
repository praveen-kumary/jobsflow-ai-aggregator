export * from "./pipeline/runner";
export * from "./scrapers/base";
export * from "./scrapers/yohire";
export * from "./scrapers/fresherstech";
export * from "./scrapers/jobsnet";
export * from "./scrapers/offcampusjobs4u";
export * from "./scrapers/freshershunt";
export * from "./pipeline/enrich";
export * from "./pipeline/dedup";
export * from "./utils/apply-url-extractor";
export * from "./utils/deadline-extractor";
export * from "./crons/expiry";

import { runAllActiveScrapers, processPendingBacklog } from "./pipeline/runner";
import { runAutoExpiry } from "./crons/expiry";

export async function startWorkerDaemon() {
  console.log("=================================================");
  console.log("🚀 Starting Job Aggregator Background Worker Daemon");
  console.log("=================================================");

  // 1. Initial Auto-Expiry Check
  try {
    console.log("\n[Worker] Running initial auto-expiry check...");
    await runAutoExpiry();
  } catch (err) {
    console.error("[Worker] Auto-expiry check failed:", err);
  }

  // 2. Initial Backlog Ingestion (process 10 pending jobs on startup)
  try {
    console.log("\n[Worker] Processing initial backlog batch...");
    const backlogRes = await processPendingBacklog(10);
    console.log(`[Worker] Initial backlog batch: ${backlogRes.newJobsCreated} new drafts created, ${backlogRes.duplicatesMerged} duplicates merged.`);
  } catch (err) {
    console.error("[Worker] Initial backlog batch failed:", err);
  }

  // 3. Periodic Schedule (Run every 30 minutes)
  const INTERVAL_MS = 30 * 60 * 1000;
  setInterval(async () => {
    console.log("\n[Worker] ⏰ Starting scheduled discovery cycle...");
    try {
      await runAutoExpiry();
      await runAllActiveScrapers(5);
      await processPendingBacklog(10);
    } catch (err) {
      console.error("[Worker] Scheduled cycle error:", err);
    }
  }, INTERVAL_MS);

  console.log(`[Worker] Worker daemon active and listening. Periodic cycles every 30 mins.`);
}

// Auto-start if executed directly via CLI
if (require.main === module || process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js")) {
  startWorkerDaemon().catch(console.error);
}

