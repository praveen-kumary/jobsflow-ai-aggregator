/**
 * Test: Run the social pipeline for published jobs
 */
import "dotenv/config";
import { prisma } from "@repo/db";
import { runSocialPipeline } from "../social/social-pipeline";

async function main() {
  // First, publish a couple of draft jobs so they can be processed
  const draftJobs = await prisma.job.findMany({
    where: { status: "draft" },
    take: 3,
    select: { id: true, company: true, role: true },
  });

  console.log(`Found ${draftJobs.length} draft jobs, publishing them first...\n`);

  for (const job of draftJobs) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "published", publishedAt: new Date() },
    });
    console.log(`  ✅ Published: ${job.company} — ${job.role}`);
  }

  // Now run social pipeline for each
  console.log(`\n📱 Running social pipeline...\n`);

  for (const job of draftJobs) {
    try {
      const result = await runSocialPipeline(job.id, { template: "default" });
      console.log(`  Result: ${result.postsCreated} posts, ${result.errors.length} errors`);
    } catch (err: any) {
      console.error(`  ❌ Pipeline failed: ${err.message}`);
    }
  }

  // Show summary
  const posts = await prisma.socialPost.findMany({
    include: { job: { select: { company: true, role: true } } },
  });

  console.log(`\n========================================`);
  console.log(`SOCIAL POSTS SUMMARY: ${posts.length} total`);
  console.log(`========================================`);
  console.table(
    posts.map((p) => ({
      company: p.job.company.slice(0, 25),
      platform: p.platform,
      status: p.status,
      hasImage: !!p.imageUrl,
      captionLen: p.caption.length,
    }))
  );
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
