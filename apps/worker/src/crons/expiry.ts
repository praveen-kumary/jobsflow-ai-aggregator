import { prisma } from "@repo/db";

/**
 * Auto-Expiry Cron (Midnight IST daily)
 * Section 10: Auto-closes jobs on their deadline date.
 * Expired jobs drop from active public listings but stay in DB.
 */
export async function runAutoExpiry(): Promise<{ count: number; expiredJobIds: string[] }> {
  const now = new Date();

  // Find jobs to expire
  const toExpire = await prisma.job.findMany({
    where: {
      status: "published",
      deadline: { lt: now },
    },
    select: { id: true, company: true, role: true, deadline: true },
  });

  if (toExpire.length === 0) {
    console.log(`[Expiry Cron] ${now.toISOString()}: 0 jobs expired.`);
    return { count: 0, expiredJobIds: [] };
  }

  const ids = toExpire.map((j) => j.id);

  const result = await prisma.job.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "expired",
      expiredAt: now,
    },
  });

  console.log(`[Expiry Cron] ${now.toISOString()}: Successfully expired ${result.count} past-deadline job(s):`);
  toExpire.forEach((j) => {
    console.log(`  - [${j.company}] ${j.role} (Deadline was: ${j.deadline?.toISOString()})`);
  });

  return { count: result.count, expiredJobIds: ids };
}

// Allow direct execution: npx tsx src/crons/expiry.ts
if (require.main === module) {
  runAutoExpiry()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error running expiry cron:", err);
      process.exit(1);
    });
}
