import { prisma } from "@/lib/prisma";
import { ConflictsClient } from "./conflicts-client";

export const dynamic = "force-dynamic";

export default async function ConflictsPage() {
  const unresolvedConflicts = await prisma.categoryConflict.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Category Conflicts
        </h1>
        <p className="text-xs text-[#6B6D75] mt-0.5">
          Tier-1 alias vs LLM extraction disagreements — resolve instead of silent guessing
        </p>
      </div>

      <ConflictsClient initialConflicts={unresolvedConflicts} />
    </div>
  );
}
