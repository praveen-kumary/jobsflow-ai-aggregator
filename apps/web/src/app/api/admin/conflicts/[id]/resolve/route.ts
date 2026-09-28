import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { resolvedValue, updateAlias } = await request.json();

    const conflict = await prisma.categoryConflict.findUnique({ where: { id } });
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    // Mark conflict resolved
    const updated = await prisma.categoryConflict.update({
      where: { id },
      data: {
        resolved: true,
        resolvedValue,
      },
    });

    // Optionally update alias
    if (updateAlias) {
      const rawJob = await prisma.rawJob.findUnique({ where: { id: conflict.jobId } });
      if (rawJob) {
        await prisma.categoryAlias.upsert({
          where: {
            sourceId_rawValue_canonicalType: {
              sourceId: rawJob.sourceId,
              rawValue: conflict.aliasValue,
              canonicalType: conflict.canonicalType,
            },
          },
          update: {
            canonicalValue: resolvedValue,
          },
          create: {
            sourceId: rawJob.sourceId,
            rawValue: conflict.aliasValue,
            canonicalType: conflict.canonicalType,
            canonicalValue: resolvedValue,
            confidence: 1.0,
            createdBy: "manual",
          },
        });
      }
    }

    return NextResponse.json({ success: true, conflict: updated });
  } catch (error: any) {
    console.error("Error resolving category conflict:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
