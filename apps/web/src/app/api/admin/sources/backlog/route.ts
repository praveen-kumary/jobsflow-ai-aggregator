import { NextResponse } from "next/server";
import { processPendingBacklog } from "@repo/worker";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = Number(body.batchSize) || 10;
    const sourceId = body.sourceId || undefined;

    const result = await processPendingBacklog(batchSize, sourceId);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} pending raw jobs: ${result.newJobsCreated} drafts created, ${result.duplicatesMerged} duplicates merged.`,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
