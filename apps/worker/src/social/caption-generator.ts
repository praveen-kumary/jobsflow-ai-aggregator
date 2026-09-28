/**
 * Social Caption Generator
 * 
 * Uses Claude Haiku to generate platform-specific captions.
 * Falls back to a deterministic template when API key isn't set.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface CaptionInput {
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  jobType: string;
  salaryText: string | null;
  deadline: Date | null;
  applyUrl: string;
  slug: string;
}

export type Platform = "telegram" | "instagram" | "whatsapp";

const PLATFORM_PROMPTS: Record<Platform, string> = {
  telegram: `Generate a Telegram channel post caption for this job. Use markdown formatting (bold, italic).
Include: company, role, location, batch, job type, salary if available, deadline if available.
End with a "🔗 Apply Now" line. Keep it concise but informative (150-250 words).
Use relevant emojis sparingly. Professional tone.`,

  instagram: `Generate an Instagram post caption for this job. 
Keep it SHORT (80-120 words). Conversational, energetic tone.
Use emojis naturally. End with a call to action.
Add 8-12 relevant hashtags at the end (e.g. #OffCampus #Fresher2026 #TechJobs #Hiring).`,

  whatsapp: `Generate a WhatsApp message for sharing this job.
Conversational, friendly tone. Use emojis naturally.
Keep it concise (100-150 words). Include all key details.
End with the apply link. No hashtags.`,
};

/**
 * Generate a caption for a specific platform using Claude Haiku.
 */
export async function generateCaption(
  job: CaptionInput,
  platform: Platform
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const hasValidKey = apiKey && apiKey !== "your-anthropic-api-key" && apiKey.startsWith("sk-ant");

  if (!hasValidKey) {
    return generateFallbackCaption(job, platform);
  }

  const client = new Anthropic({ apiKey });

  const jobDetails = `
Company: ${job.company}
Role: ${job.role}
Location: ${job.city.join(", ") || "Pan India"}
Batch: ${job.batchYears.join(", ")}
Job Type: ${job.jobType}
${job.salaryText ? `Salary: ${job.salaryText}` : ""}
${job.deadline ? `Deadline: ${new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : ""}
Apply URL: https://fresherportal.com/jobs/${job.slug}
`.trim();

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `${PLATFORM_PROMPTS[platform]}\n\nJob Details:\n${jobDetails}`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type === "text") {
      return block.text.trim();
    }
  } catch (err: any) {
    console.error(`Caption generation failed for ${platform}: ${err.message}`);
  }

  return generateFallbackCaption(job, platform);
}

/**
 * Deterministic fallback caption when Claude API isn't available.
 */
function generateFallbackCaption(job: CaptionInput, platform: Platform): string {
  const city = job.city.length > 0 ? job.city.join(", ") : "Pan India";
  const batch = job.batchYears.join(", ");
  const deadlineStr = job.deadline
    ? `\n📅 Deadline: ${new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  const salaryStr = job.salaryText ? `\n💰 ${job.salaryText}` : "";
  const url = `https://fresherportal.com/jobs/${job.slug}`;

  switch (platform) {
    case "telegram":
      return `🏢 **${job.company}** is hiring!

**${job.role}**

📍 ${city}
🎓 ${batch} Batch
💼 ${job.jobType === "internship" ? "Internship" : "Fresher"}${salaryStr}${deadlineStr}

✅ Verified opening with direct ATS link

🔗 [Apply Now](${url})

@FresherPortal | Verified Off-Campus Drives`;

    case "instagram":
      return `🚀 ${job.company} is hiring — ${job.role}!

📍 ${city}
🎓 ${batch} Batch
💼 ${job.jobType === "internship" ? "Internship" : "Full-time"}${salaryStr}${deadlineStr}

Apply now! Link in bio or visit fresherportal.com 🔗

#OffCampus #${job.company.replace(/\s+/g, "")} #Fresher${job.batchYears[0] || "2026"} #Hiring #TechJobs #FresherJobs #JobAlert #${job.city[0]?.replace(/\s+/g, "") || "India"}Jobs`;

    case "whatsapp":
      return `🏢 *${job.company}* is hiring!

*${job.role}*

📍 ${city}
🎓 ${batch} Batch
💼 ${job.jobType === "internship" ? "Internship" : "Fresher"}${salaryStr}${deadlineStr}

✅ Verified opening

👉 Apply: ${url}

Forward to friends who might be interested! 🙌`;
  }
}

/**
 * Generate captions for all platforms at once.
 */
export async function generateAllCaptions(
  job: CaptionInput
): Promise<Record<Platform, string>> {
  const [telegram, instagram, whatsapp] = await Promise.all([
    generateCaption(job, "telegram"),
    generateCaption(job, "instagram"),
    generateCaption(job, "whatsapp"),
  ]);

  return { telegram, instagram, whatsapp };
}
