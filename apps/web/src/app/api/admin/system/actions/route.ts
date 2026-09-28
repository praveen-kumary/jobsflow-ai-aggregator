import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === "run_expiry") {
      const now = new Date();
      const result = await prisma.job.updateMany({
        where: {
          status: "published",
          deadline: { lt: now },
        },
        data: {
          status: "expired",
          expiredAt: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Auto-expiry executed: ${result.count} jobs expired.`,
        count: result.count,
      });
    }

    if (action === "publish_all_drafts") {
      const result = await prisma.job.updateMany({
        where: { status: "draft" },
        data: {
          status: "published",
          publishedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Published ${result.count} draft jobs.`,
        count: result.count,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in system actions API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
