import { prisma } from "@repo/db";

async function main() {
  const sources = await prisma.source.findMany({
    select: { id: true, name: true, isActive: true, lastScrapedAt: true },
  });
  console.log("Sources in DB:", sources.length);
  for (const s of sources) {
    const rawCount = await prisma.rawJob.count({ where: { sourceId: s.id } });
    console.log(`- ${s.name} (${s.id}): active=${s.isActive}, lastScrapedAt=${s.lastScrapedAt}, rawJobs=${rawCount}`);
  }
  const totalJobs = await prisma.job.count();
  console.log(`Total canonical jobs in DB: ${totalJobs}`);
}

main().catch(console.error);
