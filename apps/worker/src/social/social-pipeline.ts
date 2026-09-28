/**
 * Social Pipeline Orchestrator
 * 
 * Runs when a job is published:
 * 1. Resolves company logo (if not cached)
 * 2. Generates social image (Satori → PNG)
 * 3. Generates captions per platform (Claude Haiku)
 * 4. Creates SocialPost rows
 * 5. Optionally auto-sends to Telegram/Instagram
 */

import { prisma } from "@repo/db";
import { resolveCompanyLogo } from "../utils/logo-resolver";
import { generateAndSaveJobImage } from "./social-image-generator";
import { generateAllCaptions, type CaptionInput } from "./caption-generator";

export interface SocialPipelineResult {
  jobId: string;
  imagePath: string | null;
  postsCreated: number;
  errors: string[];
}

/**
 * Run the full social pipeline for a published job.
 */
export async function runSocialPipeline(
  jobId: string,
  options: {
    template?: string;
    platforms?: ("telegram" | "instagram" | "whatsapp")[];
    autoSendTelegram?: boolean;
  } = {}
): Promise<SocialPipelineResult> {
  const {
    template = "default",
    platforms = ["telegram", "instagram", "whatsapp"],
    autoSendTelegram = false,
  } = options;

  const errors: string[] = [];

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job not found: ${jobId}`);

  console.log(`\n🎨 Running social pipeline for: ${job.company} — ${job.role}`);

  // 1. Ensure company logo is resolved
  try {
    await resolveCompanyLogo(job.companyNormalized);
    console.log("  ✅ Logo resolved");
  } catch (err: any) {
    errors.push(`Logo resolution: ${err.message}`);
    console.log(`  ⚠️ Logo resolution failed: ${err.message}`);
  }

  // 2. Generate social image
  let imagePath: string | null = null;
  try {
    imagePath = await generateAndSaveJobImage(jobId, template);
    console.log(`  ✅ Image generated: ${imagePath}`);
  } catch (err: any) {
    errors.push(`Image generation: ${err.message}`);
    console.log(`  ❌ Image generation failed: ${err.message}`);
  }

  // 3. Generate captions
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

  let captions: Record<string, string> = {};
  try {
    captions = await generateAllCaptions(captionInput);
    console.log("  ✅ Captions generated for:", Object.keys(captions).join(", "));
  } catch (err: any) {
    errors.push(`Caption generation: ${err.message}`);
    console.log(`  ❌ Caption generation failed: ${err.message}`);
  }

  // 4. Create SocialPost rows
  let postsCreated = 0;
  for (const platform of platforms) {
    const caption = captions[platform] || `${job.company} is hiring — ${job.role}. Apply now!`;
    const status = platform === "whatsapp" ? "manual_pending" : "pending";

    try {
      // Check if post already exists for this job+platform
      const existing = await prisma.socialPost.findFirst({
        where: { jobId, platform },
      });

      if (existing) {
        // Update existing
        await prisma.socialPost.update({
          where: { id: existing.id },
          data: {
            caption,
            imageUrl: imagePath,
            template,
            status: existing.status === "posted" ? "posted" : status,
          },
        });
        console.log(`  🔄 Updated existing ${platform} post`);
      } else {
        await prisma.socialPost.create({
          data: {
            jobId,
            platform,
            imageUrl: imagePath,
            caption,
            template,
            status,
          },
        });
        postsCreated++;
        console.log(`  ✨ Created ${platform} post (${status})`);
      }
    } catch (err: any) {
      errors.push(`${platform} post creation: ${err.message}`);
      console.log(`  ❌ ${platform} post creation failed: ${err.message}`);
    }
  }

  // 5. Auto-send Telegram if enabled
  if (autoSendTelegram && platforms.includes("telegram")) {
    try {
      const telegramPost = await prisma.socialPost.findFirst({
        where: { jobId, platform: "telegram", status: "pending" },
      });
      if (telegramPost) {
        // Telegram sending will be implemented in telegram-poster.ts
        console.log("  📨 Telegram auto-send: queued (poster not yet wired)");
      }
    } catch (err: any) {
      errors.push(`Telegram auto-send: ${err.message}`);
    }
  }

  console.log(`  📊 Pipeline complete: ${postsCreated} posts created, ${errors.length} errors`);

  return { jobId, imagePath, postsCreated, errors };
}

/**
 * Run social pipeline for all recently published jobs that don't have social posts yet.
 */
export async function runSocialPipelineForNewJobs(
  options: { template?: string; limit?: number } = {}
): Promise<SocialPipelineResult[]> {
  const { template = "default", limit = 10 } = options;

  // Find published jobs without any social posts
  const jobs = await prisma.job.findMany({
    where: {
      status: "published",
      socialPosts: { none: {} },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, company: true, role: true },
  });

  console.log(`\n📱 Found ${jobs.length} published jobs without social posts\n`);

  const results: SocialPipelineResult[] = [];
  for (const job of jobs) {
    try {
      const result = await runSocialPipeline(job.id, { template });
      results.push(result);
    } catch (err: any) {
      console.error(`Pipeline failed for ${job.company} — ${job.role}: ${err.message}`);
      results.push({ jobId: job.id, imagePath: null, postsCreated: 0, errors: [err.message] });
    }
  }

  return results;
}
