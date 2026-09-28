import { prisma } from "@/lib/prisma";
import { OverviewClient } from "./overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate stats in parallel
  const [
    pendingDrafts,
    needsReviewCount,
    publishedTotal,
    publishedToday,
    expiringSoonCount,
    expiredTotal,
    aggregates,
    activeSources,
    expiringSoonJobs,
    recentRuns,
  ] = await Promise.all([
    prisma.job.count({ where: { status: "draft" } }),
    prisma.job.count({
      where: { status: "draft", categoryConfidence: { not: "high" } },
    }),
    prisma.job.count({ where: { status: "published" } }),
    prisma.job.count({
      where: { status: "published", publishedAt: { gte: startOfToday } },
    }),
    prisma.job.count({
      where: {
        status: "published",
        deadline: { lte: threeDaysFromNow, gte: now },
      },
    }),
    prisma.job.count({ where: { status: "expired" } }),
    prisma.job.aggregate({
      _sum: {
        viewCount: true,
        applyClickCount: true,
      },
    }),
    prisma.source.count({ where: { isActive: true } }),
    prisma.job.findMany({
      where: {
        status: "published",
        deadline: { lte: sevenDaysFromNow, gte: now },
      },
      orderBy: { deadline: "asc" },
      take: 6,
      select: {
        id: true,
        company: true,
        role: true,
        city: true,
        batchYears: true,
        deadline: true,
      },
    }),
    prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 6,
      include: { source: { select: { name: true } } },
    }),
  ]);

  const stats = {
    pendingDrafts,
    needsReviewCount,
    publishedTotal,
    publishedToday,
    expiringSoonCount,
    expiredTotal,
    totalViews: aggregates._sum.viewCount || 0,
    totalApplies: aggregates._sum.applyClickCount || 0,
    activeSources,
  };

  return (
    <OverviewClient
      stats={stats}
      expiringSoonJobs={expiringSoonJobs}
      recentRuns={recentRuns}
    />
  );
}
