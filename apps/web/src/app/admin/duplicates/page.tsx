import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CopyCheck, ExternalLink, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DuplicatesAuditPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const duplicateRawJobs = await prisma.rawJob.findMany({
    where: {
      status: "duplicate",
      processedAt: { gte: sevenDaysAgo },
    },
    orderBy: { processedAt: "desc" },
    include: {
      source: { select: { name: true } },
    },
  });

  // Fetch the matched jobs
  const jobIds = duplicateRawJobs
    .map((rj) => rj.duplicateOfJobId)
    .filter(Boolean) as string[];

  const matchedJobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    select: {
      id: true,
      company: true,
      role: true,
      city: true,
      slug: true,
      status: true,
      deadline: true,
    },
  });

  const jobMap = new Map(matchedJobs.map((j) => [j.id, j]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Duplicate Audit
          </h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Spot-check cross-source dedup merges for false positives
          </p>
        </div>
        <div className="text-xs text-[#86888F]">
          {duplicateRawJobs.length} <span className="text-[#6B6D75]">in 7 days</span>
        </div>
      </div>

      <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl overflow-hidden shadow-xl">
        {duplicateRawJobs.length === 0 ? (
          <div className="p-12 text-center text-[#86888F]">
            <CopyCheck className="mx-auto h-8 w-8 text-[#86888F] mb-2 opacity-50" />
            <p className="text-base font-medium text-white">Zero Duplicate Merges in Past 7 Days</p>
            <p className="text-xs mt-1">When cross-source postings match existing jobs, their merge audit trail appears here.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2D3139] bg-[#141518] text-[11px] font-bold uppercase tracking-wider text-[#86888F]">
                <th className="py-3 px-4">Incoming Duplicate (Scraped)</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Target Master Job</th>
                <th className="py-3 px-4">Processed Date</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262830]">
              {duplicateRawJobs.map((rj) => {
                const target = rj.duplicateOfJobId ? jobMap.get(rj.duplicateOfJobId) : null;
                return (
                  <tr key={rj.id} className="hover:bg-[#20222A] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white truncate max-w-sm">
                        {rj.rawTitle}
                      </div>
                      <a
                        href={rj.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#86888F] hover:text-white flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate max-w-xs">{rj.sourceUrl}</span>
                        <ExternalLink size={10} />
                      </a>
                    </td>

                    <td className="py-3 px-4 text-[#EDEDEF]">
                      {rj.source.name}
                    </td>

                    <td className="py-3 px-4">
                      {target ? (
                        <div>
                          <Link
                            href={`/admin/jobs/${target.id}`}
                            className="font-bold text-white hover:text-[#3FA66B] flex items-center gap-1"
                          >
                            <span>{target.company} — {target.role}</span>
                            <ArrowRight size={11} className="text-[#3FA66B]" />
                          </Link>
                          <span className="text-[11px] text-[#86888F]">
                            {target.city.join(", ")} • {target.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#86888F]">Master Job ID: {rj.duplicateOfJobId}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#86888F] font-mono tabular-nums">
                      {rj.processedAt ? new Date(rj.processedAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {target && (
                        <Link
                          href={`/admin/jobs/${target.id}`}
                          className="px-2.5 py-1 bg-[#252830] hover:bg-[#30333E] text-[11px] font-semibold text-white rounded border border-[#343844]"
                        >
                          View Master
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
