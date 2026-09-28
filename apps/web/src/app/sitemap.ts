import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Fetch all published jobs
  const jobs = await prisma.job.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });

  const jobUrls: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${baseUrl}/jobs/${j.slug}`,
    lastModified: j.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Static pages that actually exist
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/report`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return [...staticPages, ...jobUrls];
}
