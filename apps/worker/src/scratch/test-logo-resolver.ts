/**
 * Test script: resolve logos for all companies in the DB
 */
import "dotenv/config";
import { resolveAllMissingLogos } from "../utils/logo-resolver";
import { prisma } from "@repo/db";

async function main() {
  console.log("🎨 Resolving company logos for all existing jobs...\n");

  const result = await resolveAllMissingLogos();

  console.log("\n========================================");
  console.log("LOGO RESOLUTION SUMMARY");
  console.log("========================================");
  console.log(`Total resolved: ${result.resolved}`);
  console.log("By tier:");
  for (const [tier, count] of Object.entries(result.byTier)) {
    console.log(`  ${tier}: ${count}`);
  }

  // Show all logos in DB
  const logos = await prisma.companyLogo.findMany({
    orderBy: { createdAt: "desc" },
  });

  console.log(`\nAll logos in DB (${logos.length}):`);
  console.table(
    logos.map((l) => ({
      company: l.companyNormalized.slice(0, 30),
      source: l.source,
      domain: l.resolvedDomain || "—",
      verified: l.isVerified,
      url: l.logoUrl.startsWith("data:") ? "[monogram]" : l.logoUrl.slice(0, 60),
    }))
  );
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
