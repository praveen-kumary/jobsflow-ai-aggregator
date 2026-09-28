import { prisma } from "@/lib/prisma";
import { SourcesClient } from "./sources-client";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const sources = await prisma.source.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { rawJobs: true },
      },
      scrapeRuns: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  const formatted = sources.map((s) => ({
    id: s.id,
    name: s.name,
    baseUrl: s.baseUrl,
    feedUrl: s.feedUrl,
    scrapeConfig: s.scrapeConfig,
    isActive: s.isActive,
    lastScrapedAt: s.lastScrapedAt,
    rawJobsCount: s._count.rawJobs,
    scrapeRuns: s.scrapeRuns,
  }));

  const rawJobsTotal = await prisma.rawJob.count();
  const rawJobsPending = await prisma.rawJob.count({ where: { status: "pending" } });
  const rawJobsProcessed = await prisma.rawJob.count({ where: { status: "processed" } });
  const canonicalJobsTotal = await prisma.job.count();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Sources & Pipeline
          </h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Configure scrapers, trigger runs, and process the ingestion backlog
          </p>
        </div>
        <div className="text-xs text-[#86888F]">
          {sources.filter((s) => s.isActive).length}/{sources.length} <span className="text-[#6B6D75]">active</span>
        </div>
      </div>

      <SourcesClient
        initialSources={formatted}
        backlogStats={{
          rawJobsTotal,
          rawJobsPending,
          rawJobsProcessed,
          canonicalJobsTotal,
        }}
      />
    </div>
  );
}
