import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.source.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.scrapeConfig !== undefined && { scrapeConfig: body.scrapeConfig }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.baseUrl !== undefined && { baseUrl: body.baseUrl }),
      },
    });

    return NextResponse.json({ success: true, source: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { runScraperForSource } from "@repo/worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Run the actual production scraper pipeline
    const stats = await runScraperForSource(id, 5);

    return NextResponse.json({
      success: true,
      message: `Scrape completed for ${source.name}: ${stats.discoveredCount} discovered, ${stats.newJobsCreated} new job drafts created, ${stats.skippedAlreadySeen} skipped as already scraped.`,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
