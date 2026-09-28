import { prisma } from "@/lib/prisma";
import { QueueTable } from "./queue-table";

// Revalidate or dynamic
export const dynamic = "force-dynamic";

export default async function AdminQueuePage() {
  // Fetch draft jobs with rawJob relation for full details
  const draftJobs = await prisma.job.findMany({
    where: { status: "draft" },
    include: {
      rawJob: {
        select: {
          id: true,
          sourceUrl: true,
          rawTitle: true,
          rawHtml: true,
          sourceCategoryTags: true,
          sourceId: true,
          scrapedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Split into needs_review and routine draft jobs
  const needsReviewJobs = draftJobs.filter((j) => j.categoryConfidence !== "high");
  const routineJobs = draftJobs.filter((j) => j.categoryConfidence === "high");
  const sortedJobs = [...needsReviewJobs, ...routineJobs];

  const pendingCount = draftJobs.length;
  const needsReviewCount = needsReviewJobs.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Review Queue
          </h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Review scraped postings, resolve conflicts, and publish
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="px-4 py-2 bg-[#1A1B1F] border border-[#2D3139] rounded-md">
            <span className="text-xs text-[#86888F] uppercase tracking-wider block">Pending</span>
            <span className="text-xl font-bold text-[#EDEDEF]">{pendingCount}</span>
          </div>
          <div className="px-4 py-2 bg-[#1A1B1F] border border-[#D6553D]/40 rounded-md">
            <span className="text-xs text-[#D6553D] uppercase tracking-wider block font-semibold">Needs Review</span>
            <span className="text-xl font-bold text-[#D6553D]">{needsReviewCount}</span>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg overflow-hidden shadow-xl">
        <QueueTable initialJobs={sortedJobs} />
      </div>
    </div>
  );
}
