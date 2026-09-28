/**
 * Test: generate social images + captions for jobs in the DB
 */
import "dotenv/config";
import { prisma } from "@repo/db";
import { generateAndSaveJobImage } from "../social/social-image-generator";
import { generateAllCaptions, type CaptionInput } from "../social/caption-generator";

async function main() {
  // Get a few published/draft jobs
  const jobs = await prisma.job.findMany({
    where: { status: { in: ["published", "draft"] } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (jobs.length === 0) {
    console.log("No jobs found. Run scrapers first.");
    return;
  }

  console.log(`🎨 Generating social content for ${jobs.length} jobs...\n`);

  for (const job of jobs) {
    console.log(`\n━━━ ${job.company} — ${job.role} ━━━`);

    // Generate image
    try {
      const imagePath = await generateAndSaveJobImage(job.id, "default");
      console.log(`  📸 Image: ${imagePath}`);
    } catch (err: any) {
      console.error(`  ❌ Image failed: ${err.message}`);
    }

    // Generate captions
    const captionInput: CaptionInput = {
      company: job.company,
      role: job.role,
      city: job.city,
      batchYears: job.batchYears,
      jobType: job.jobType,
      salaryText: job.salaryText,
      deadline: job.deadline,
      applyUrl: job.applyUrl,
      slug: job.slug,
    };

    try {
      const captions = await generateAllCaptions(captionInput);
      console.log(`\n  📱 Telegram caption:\n${indent(captions.telegram)}`);
      console.log(`\n  📸 Instagram caption:\n${indent(captions.instagram)}`);
      console.log(`\n  💬 WhatsApp caption:\n${indent(captions.whatsapp)}`);
    } catch (err: any) {
      console.error(`  ❌ Captions failed: ${err.message}`);
    }
  }
}

function indent(text: string): string {
  return text.split("\n").map((l) => "    " + l).join("\n");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
