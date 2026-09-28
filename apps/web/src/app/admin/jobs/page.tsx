import { prisma } from "@/lib/prisma";
import { JobsTable } from "./jobs-table";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;

  const whereClause: any = {};
  if (status && status !== "all") {
    whereClause.status = status;
  }

  const jobs = await prisma.job.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      company: true,
      role: true,
      city: true,
      batchYears: true,
      jobType: true,
      status: true,
      deadline: true,
      slug: true,
      viewCount: true,
      applyClickCount: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            All Jobs
          </h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Search, filter, edit, and manage job lifecycle
          </p>
        </div>
        <div className="text-xs text-[#86888F]">
          {jobs.length} <span className="text-[#6B6D75]">total</span>
        </div>
      </div>

      <JobsTable initialJobs={jobs} />
    </div>
  );
}
