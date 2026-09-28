import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSocialPostsForJob } from "@/lib/social-pipeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "approve") {
      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Default deadline +30 days if null
      const deadline = job.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const updated = await prisma.job.update({
        where: { id },
        data: {
          status: "published",
          publishedAt: new Date(),
          deadline,
        },
      });

      // Auto-generate social posts (runs inline, fast)
      let socialResult = { created: 0 };
      try {
        socialResult = await createSocialPostsForJob(id);
      } catch (err) {
        console.error("Social pipeline error (non-blocking):", err);
      }

      return NextResponse.json({
        success: true,
        job: updated,
        social: { postsCreated: socialResult.created },
      });
    }

    if (action === "reject") {
      const updated = await prisma.job.update({
        where: { id },
        data: {
          status: "rejected",
        },
      });

      return NextResponse.json({ success: true, job: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in job action API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
