import { runAllActiveScrapers, runScraperForSource } from "../pipeline/runner";

async function main() {
  const targetSourceId = process.argv[2];

  if (targetSourceId) {
    console.log(`Running scraper for single source: ${targetSourceId}`);
    const stat = await runScraperForSource(targetSourceId, 5);
    console.log("Run completed:", stat);
  } else {
    console.log("Running scraper for ALL active sources...");
    const stats = await runAllActiveScrapers(3);
    console.log("\n========================================");
    console.log("ALL ACTIVE SCRAPERS COMPLETED SUMMARY:");
    console.log("========================================");
    console.table(stats);
  }
}

main()
  .catch((e) => {
    console.error("Scraper execution error:", e);
    process.exit(1);
  });
