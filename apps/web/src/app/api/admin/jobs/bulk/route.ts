import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSocialPostsForJobs } from "@/lib/social-pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, jobIds, highConfidenceOnly } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
    }

    const now = new Date();
    const defaultDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (action === "approve") {
      let publishedIds: string[] = [];

      if (highConfidenceOnly) {
        // Find all draft jobs with high confidence
        const highConfJobs = await prisma.job.findMany({
          where: {
            status: "draft",
            categoryConfidence: "high",
          },
          select: { id: true, deadline: true },
        });

        if (highConfJobs.length === 0) {
          return NextResponse.json({ success: true, count: 0, socialPosts: 0, message: "No high-confidence draft jobs found." });
        }

        publishedIds = highConfJobs.map((j) => j.id);

        await prisma.job.updateMany({
          where: { id: { in: publishedIds } },
          data: {
            status: "published",
            publishedAt: now,
          },
        });

        // Set deadline for jobs where deadline is null
        const nullDeadlineIds = highConfJobs.filter((j) => !j.deadline).map((j) => j.id);
        if (nullDeadlineIds.length > 0) {
          await prisma.job.updateMany({
            where: { id: { in: nullDeadlineIds } },
            data: { deadline: defaultDeadline },
          });
        }
      } else if (Array.isArray(jobIds) && jobIds.length > 0) {
        const jobsToApprove = await prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, deadline: true },
        });

        publishedIds = jobsToApprove.map((j) => j.id);

        await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: {
            status: "published",
            publishedAt: now,
          },
        });

        const nullDeadlineIds = jobsToApprove.filter((j) => !j.deadline).map((j) => j.id);
        if (nullDeadlineIds.length > 0) {
          await prisma.job.updateMany({
            where: { id: { in: nullDeadlineIds } },
            data: { deadline: defaultDeadline },
          });
        }
      } else {
        return NextResponse.json({ error: "Missing jobIds or highConfidenceOnly flag." }, { status: 400 });
      }

      // Auto-generate social posts for all published jobs
      let socialPosts = 0;
      try {
        const socialResult = await createSocialPostsForJobs(publishedIds);
        socialPosts = socialResult.totalCreated;
      } catch (err) {
        console.error("Social pipeline error (non-blocking):", err);
      }

      return NextResponse.json({
        success: true,
        count: publishedIds.length,
        socialPosts,
        message: `Published ${publishedIds.length} jobs + queued ${socialPosts} social posts.`,
      });
    }

    if (action === "reject") {
      if (Array.isArray(jobIds) && jobIds.length > 0) {
        const res = await prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: {
            status: "rejected",
          },
        });

        return NextResponse.json({
          success: true,
          count: res.count,
          message: `Successfully rejected ${res.count} jobs.`,
        });
      }

      return NextResponse.json({ error: "Missing jobIds array." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in bulk jobs action:", error);
    return NextResponse.json({ error: error.message || "Failed to execute bulk action" }, { status: 500 });
  }
}
