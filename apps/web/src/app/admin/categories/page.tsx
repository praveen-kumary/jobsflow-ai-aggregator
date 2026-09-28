import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./categories-client";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [canonicalValues, aliases, sources] = await Promise.all([
    prisma.canonicalValue.findMany({
      orderBy: [{ type: "asc" }, { value: "asc" }],
    }),
    prisma.categoryAlias.findMany({
      orderBy: [{ sourceId: "asc" }, { canonicalType: "asc" }],
      include: { source: { select: { name: true } } },
    }),
    prisma.source.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Taxonomy & Aliases
        </h1>
        <p className="text-xs text-[#6B6D75] mt-0.5">
          Manage canonical values and source-specific tag mappings
        </p>
      </div>

      <CategoriesClient
        initialCanonical={canonicalValues}
        initialAliases={aliases}
        sources={sources}
      />
    </div>
  );
}
