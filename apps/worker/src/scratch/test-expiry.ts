import { prisma } from "@repo/db";
import { runAutoExpiry } from "../crons/expiry";

async function main() {
  console.log("=== Testing Auto-Expiry Cron ===");

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Create a job whose deadline expired yesterday
  const expiredJob = await prisma.job.create({
    data: {
      company: "Acme Robotics",
      companyNormalized: "acme robotics",
      role: "Junior Firmware Engineer",
      roleNormalized: "firmware engineer",
      slug: `acme-expired-test-${Date.now()}`,
      description: "Firmware role test",
      batchYears: ["2026"],
      city: ["Pune"],
      degree: ["B.E/B.Tech"],
      jobType: "fresher",
      applyUrl: "https://acme.example.com",
      status: "published",
      deadline: yesterday,
    },
  });

  console.log(`Created published job with past deadline: id=${expiredJob.id}, status=${expiredJob.status}`);

  // 2. Run auto-expiry
  console.log("Running auto-expiry cron...");
  const { count, expiredJobIds } = await runAutoExpiry();

  console.log(`Cron result: ${count} jobs transitioned to expired.`);

  // 3. Verify in DB
  const check = await prisma.job.findUnique({ where: { id: expiredJob.id } });
  console.log(`Updated job status: ${check?.status}, expiredAt: ${check?.expiredAt}`);

  if (check?.status === "expired" && check.expiredAt !== null) {
    console.log("✓ Auto-expiry verification successful!");
  } else {
    console.error("✗ Auto-expiry failed to update job status!");
  }

  // Clean up
  await prisma.job.delete({ where: { id: expiredJob.id } });
  console.log("Cleaned up test job.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
