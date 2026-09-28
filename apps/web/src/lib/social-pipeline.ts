/**
 * Social Pipeline API Helper
 * 
 * Server-side function that generates social posts for published jobs.
 * Called from the approve/bulk APIs after a job is published.
 * Runs inline (not in worker) — fast enough since Satori is pure JS.
 */

import { prisma } from "@/lib/prisma";

// Inline monogram generator (no worker dependency)
const MONOGRAM_COLORS = [
  "#2563EB","#7C3AED","#DB2777","#DC2626","#EA580C","#CA8A04",
  "#16A34A","#0D9488","#0891B2","#4F46E5","#9333EA","#C026D3",
  "#059669","#0284C7","#1D4ED8","#6D28D9",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i); h |= 0;
  }
  return Math.abs(h);
}

function initials(name: string) {
  const w = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(x => x);
  if (!w.length) return "?";
  return w.length === 1 ? w[0].substring(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
}

function makeMonogramDataUri(companyNormalized: string) {
  const init = initials(companyNormalized);
  const bg = MONOGRAM_COLORS[hashStr(companyNormalized) % MONOGRAM_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="25.6" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="${init.length === 1 ? 64 : 51.2}" fill="white" letter-spacing="1">${init}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Ensure a company logo exists. Creates a monogram placeholder if needed.
 */
async function ensureLogo(companyNormalized: string) {
  const existing = await prisma.companyLogo.findUnique({ where: { companyNormalized } });
  if (existing) return;

  try {
    await prisma.companyLogo.create({
      data: {
        companyNormalized,
        logoUrl: makeMonogramDataUri(companyNormalized),
        source: "generated_monogram",
      },
    });
  } catch {
    // Race condition — already exists
  }
}

/**
 * Generate fallback captions for all 3 platforms.
 */
function generateCaptions(job: {
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  jobType: string;
  salaryText: string | null;
  deadline: Date | null;
  slug: string;
}) {
  const city = job.city.length > 0 ? job.city.join(", ") : "Pan India";
  const batch = job.batchYears.join(", ");
  const salary = job.salaryText ? `\n💰 ${job.salaryText}` : "";
  const deadlineStr = job.deadline
    ? `\n📅 Deadline: ${new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  const url = `https://fresherportal.com/jobs/${job.slug}`;
  const type = job.jobType === "internship" ? "Internship" : "Fresher";

  return {
    telegram: `🏢 **${job.company}** is hiring!\n\n**${job.role}**\n\n📍 ${city}\n🎓 ${batch} Batch\n💼 ${type}${salary}${deadlineStr}\n\n✅ Verified opening with direct ATS link\n\n🔗 [Apply Now](${url})\n\n@FresherPortal | Verified Off-Campus Drives`,
    instagram: `🚀 ${job.company} is hiring — ${job.role}!\n\n📍 ${city}\n🎓 ${batch} Batch\n💼 ${type}${salary}${deadlineStr}\n\nApply now! Link in bio or visit fresherportal.com 🔗\n\n#OffCampus #${job.company.replace(/[^a-zA-Z0-9]/g, "")} #Fresher${job.batchYears[0] || "2026"} #Hiring #TechJobs #FresherJobs #JobAlert`,
    whatsapp: `🏢 *${job.company}* is hiring!\n\n*${job.role}*\n\n📍 ${city}\n🎓 ${batch} Batch\n💼 ${type}${salary}${deadlineStr}\n\n✅ Verified opening\n\n👉 Apply: ${url}\n\nForward to friends who might be interested! 🙌`,
  };
}

/**
 * Create social posts for a single published job.
 * Fast — no image generation (that happens via worker), just DB rows + captions.
 */
export async function createSocialPostsForJob(jobId: string): Promise<{ created: number }> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { created: 0 };

  // Ensure logo exists
  await ensureLogo(job.companyNormalized);

  const captions = generateCaptions(job);
  let created = 0;

  for (const platform of ["telegram", "instagram", "whatsapp"] as const) {
    // Skip if already exists
    const existing = await prisma.socialPost.findFirst({
      where: { jobId, platform },
    });
    if (existing) continue;

    const status = platform === "whatsapp" ? "manual_pending" : "pending";

    await prisma.socialPost.create({
      data: {
        jobId,
        platform,
        caption: captions[platform],
        template: "default",
        status,
      },
    });
    created++;
  }

  return { created };
}

/**
 * Create social posts for multiple jobs at once.
 */
export async function createSocialPostsForJobs(jobIds: string[]): Promise<{ totalCreated: number }> {
  let totalCreated = 0;
  for (const id of jobIds) {
    const result = await createSocialPostsForJob(id);
    totalCreated += result.created;
  }
  return { totalCreated };
}
