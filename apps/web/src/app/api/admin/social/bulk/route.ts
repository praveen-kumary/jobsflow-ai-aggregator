import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Bulk social post actions.
 * POST /api/admin/social/bulk
 * 
 * Actions:
 *   - mark_all_posted: Mark all pending posts for a platform as "posted"
 *   - retry_all_failed: Reset all failed posts back to "pending"
 *   - generate_for_new: Create social posts for published jobs that have none
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, platform } = body;

    if (action === "mark_all_posted") {
      // Mark all pending telegram/instagram posts as posted
      const where: any = { status: "pending" };
      if (platform) where.platform = platform;

      const result = await prisma.socialPost.updateMany({
        where,
        data: { status: "posted", postedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Marked ${result.count} posts as posted.`,
      });
    }

    if (action === "retry_all_failed") {
      const where: any = { status: "failed" };
      if (platform) where.platform = platform;

      const result = await prisma.socialPost.updateMany({
        where,
        data: { status: "pending", errorMsg: null },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Reset ${result.count} failed posts to pending.`,
      });
    }

    if (action === "generate_for_new") {
      // Find published jobs without any social posts
      const jobs = await prisma.job.findMany({
        where: {
          status: "published",
          socialPosts: { none: {} },
        },
        select: {
          id: true,
          company: true,
          role: true,
          city: true,
          batchYears: true,
          jobType: true,
          salaryText: true,
          deadline: true,
          slug: true,
          companyNormalized: true,
        },
        take: 50,
      });

      if (jobs.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: "All published jobs already have social posts.",
        });
      }

      let created = 0;
      for (const job of jobs) {
        const city = job.city.length > 0 ? job.city.join(", ") : "Pan India";
        const batch = job.batchYears.join(", ");
        const salary = job.salaryText ? `\n💰 ${job.salaryText}` : "";
        const deadlineStr = job.deadline
          ? `\n📅 Deadline: ${new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
          : "";
        const url = `https://fresherportal.com/jobs/${job.slug}`;
        const type = job.jobType === "internship" ? "Internship" : "Fresher";

        const captions = {
          telegram: `🏢 **${job.company}** is hiring!\n\n**${job.role}**\n\n📍 ${city}\n🎓 ${batch} Batch\n💼 ${type}${salary}${deadlineStr}\n\n✅ Verified opening with direct ATS link\n\n🔗 [Apply Now](${url})\n\n@FresherPortal | Verified Off-Campus Drives`,
          instagram: `🚀 ${job.company} is hiring — ${job.role}!\n\n📍 ${city}\n🎓 ${batch} Batch\n💼 ${type}${salary}${deadlineStr}\n\nApply now! Link in bio or visit fresherportal.com 🔗\n\n#OffCampus #${job.company.replace(/[^a-zA-Z0-9]/g, "")} #Fresher${job.batchYears[0] || "2026"} #Hiring #TechJobs #FresherJobs #JobAlert`,
          whatsapp: `🏢 *${job.company}* is hiring!\n\n*${job.role}*\n\n📍 ${city}\n🎓 ${batch} Batch\n💼 ${type}${salary}${deadlineStr}\n\n✅ Verified opening\n\n👉 Apply: ${url}\n\nForward to friends who might be interested! 🙌`,
        };

        for (const platform of ["telegram", "instagram", "whatsapp"] as const) {
          await prisma.socialPost.create({
            data: {
              jobId: job.id,
              platform,
              caption: captions[platform],
              template: "default",
              status: platform === "whatsapp" ? "manual_pending" : "pending",
            },
          });
          created++;
        }
      }

      return NextResponse.json({
        success: true,
        count: created,
        jobs: jobs.length,
        message: `Generated ${created} social posts for ${jobs.length} jobs.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Bulk social action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
