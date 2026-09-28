import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PublicJobList } from "./public-job-list";
import { PublicNavbar } from "@/components/navbar";
import {
  Search,
  Calendar,
  MapPin,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { SocialCtaBar } from "@/components/social-cta-bar";
import { AdPlaceholder } from "@/components/ad-slot";
import { getWhatsAppUrl, getTelegramUrl } from "@/lib/site-config";

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const batch = typeof params.batch === "string" ? params.batch : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;
  const degree = typeof params.degree === "string" ? params.degree : undefined;
  const jobType =
    typeof params.jobType === "string" ? params.jobType : undefined;
  const q =
    typeof params.q === "string" ? params.q.toLowerCase().trim() : undefined;

  // Load social URLs from SiteConfig
  const [whatsappUrl, telegramUrl] = await Promise.all([
    getWhatsAppUrl(),
    getTelegramUrl(),
  ]);

  // Build filter query for published jobs
  const whereClause: any = {
    status: "published",
  };

  if (batch) {
    whereClause.batchYears = { has: batch };
  }
  if (city) {
    whereClause.city = { has: city };
  }
  if (degree) {
    whereClause.degree = { has: degree };
  }
  if (jobType) {
    whereClause.jobType = jobType;
  }
  if (q) {
    whereClause.OR = [
      { company: { contains: q, mode: "insensitive" } },
      { role: { contains: q, mode: "insensitive" } },
    ];
  }

  // Fetch jobs and canonical values in parallel
  const [jobs, canonicalValues] = await Promise.all([
    prisma.job.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        company: true,
        role: true,
        city: true,
        batchYears: true,
        degree: true,
        jobType: true,
        salaryText: true,
        deadline: true,
        slug: true,
        createdAt: true,
        applyUrl: true,
      },
    }),
    prisma.canonicalValue.findMany({
      where: { isActive: true },
      orderBy: { value: "asc" },
    }),
  ]);

  // Build filter options from canonical values in DB
  const canonicalBatchYears = canonicalValues
    .filter((cv) => cv.type === "batchYear")
    .map((cv) => cv.value)
    .sort()
    .reverse();
  const canonicalCities = canonicalValues
    .filter((cv) => cv.type === "city")
    .map((cv) => cv.value);
  const canonicalDegrees = canonicalValues
    .filter((cv) => cv.type === "degree")
    .map((cv) => cv.value);
  const canonicalJobTypes = canonicalValues
    .filter((cv) => cv.type === "jobType")
    .map((cv) => cv.value);

  const hasActiveFilters = Boolean(batch || city || degree || jobType || q);

  // Build filter URL helper — preserves existing params when toggling one filter
  function filterUrl(key: string, value: string, isActive: boolean): string {
    if (isActive) {
      // Remove this filter
      const p = new URLSearchParams();
      if (batch && key !== "batch") p.set("batch", batch);
      if (city && key !== "city") p.set("city", city);
      if (degree && key !== "degree") p.set("degree", degree);
      if (jobType && key !== "jobType") p.set("jobType", jobType);
      if (q && key !== "q") p.set("q", q);
      const qs = p.toString();
      return qs ? `/?${qs}` : "/";
    }
    // Add this filter
    const p = new URLSearchParams();
    p.set(key, value);
    if (batch && key !== "batch") p.set("batch", batch);
    if (city && key !== "city") p.set("city", city);
    if (degree && key !== "degree") p.set("degree", degree);
    if (jobType && key !== "jobType") p.set("jobType", jobType);
    if (q && key !== "q") p.set("q", q);
    return `/?${p.toString()}`;
  }

  // Page title based on active filter
  let pageTitle = "Verified Off-Campus Drives";
  if (batch) pageTitle = `${batch} Batch Off-Campus Drives`;
  if (city) pageTitle = `${city} Off-Campus Drives`;
  if (degree) pageTitle = `${degree} Off-Campus Drives`;

  return (
    <div className="min-h-screen bg-[#edf0f5] text-[#0F1729] flex flex-col">
      <PublicNavbar />

      {/* Compact search strip below nav */}
      <div className="bg-white border-b border-[#ddd]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-4">
          <form
            method="GET"
            action="/"
            className="flex-1 relative max-w-xl"
          >
            {/* Preserve active filters through search */}
            {batch && <input type="hidden" name="batch" value={batch} />}
            {city && <input type="hidden" name="city" value={city} />}
            {degree && <input type="hidden" name="degree" value={degree} />}
            {jobType && <input type="hidden" name="jobType" value={jobType} />}

            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              type="text"
              name="q"
              id="search-input"
              defaultValue={q || ""}
              placeholder="Search company or role..."
              className="w-full bg-[#f7f8fa] border border-[#d0d5dd] rounded pl-9 pr-20 py-2 text-sm text-[#1a1a2e] placeholder-[#999] focus:outline-none focus:border-[#333] transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1 rounded-md bg-[#0F1729] text-white text-xs font-semibold hover:bg-[#1E293B] transition-colors"
            >
              Search
            </button>
          </form>

          <span className="hidden sm:block text-xs text-[#888] tabular-nums font-medium">
            {jobs.length} openings
          </span>
        </div>
      </div>

      {/* Social CTA */}
      <div className="bg-white border-b border-[#ddd]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto text-center px-5 py-2.5 border-2 border-[#25D366] text-[#25D366] font-bold text-[13px] rounded hover:bg-[#25D366]/5 transition-colors">
            👉 Join Our WhatsApp Channel for Free Job Alerts
          </a>
          <a href={telegramUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto text-center px-5 py-2.5 border-2 border-[#0088cc] text-[#0088cc] font-bold text-[13px] rounded hover:bg-[#0088cc]/5 transition-colors">
            🚀 Join Our Telegram Group for Free Job Alerts
          </a>
        </div>
      </div>

      {/* Top ad */}
      <div className="max-w-[1200px] mx-auto px-4 mt-2">
        <AdPlaceholder label="Ad" minHeight={90} />
      </div>

      {/* Main content */}
      <div className="max-w-[1200px] mx-auto px-4 py-5 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Filter sidebar — hidden on mobile */}
          <aside className="hidden md:block w-52 shrink-0 md:sticky md:top-[72px] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1729]">
                Filters
              </h3>
              {hasActiveFilters && (
                <Link
                  href="/"
                  className="text-xs text-[#E8873A] hover:underline font-semibold"
                >
                  Clear all
                </Link>
              )}
            </div>

            {/* Batch Year */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5768] flex items-center gap-1.5">
                <Calendar size={12} className="text-[#4B5768]" />
                Batch Year
              </span>
              <div className="flex flex-wrap gap-1.5">
                {canonicalBatchYears.slice(0, 6).map((b) => {
                  const active = batch === b;
                  return (
                    <Link
                      key={b}
                      href={filterUrl("batch", b, active)}
                      className={`px-2.5 py-1 text-xs rounded border tabular-nums font-medium transition-colors ${
                        active
                          ? "bg-[#1565C0] text-white border-[#1565C0]"
                          : "bg-white text-[#555] border-[#d0d5dd] hover:border-[#888]"
                      }`}
                    >
                      {b}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* City */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5768] flex items-center gap-1.5">
                <MapPin size={12} className="text-[#4B5768]" />
                Location
              </span>
              <div className="flex flex-wrap gap-1.5">
                {canonicalCities.map((c) => {
                  const active = city === c;
                  return (
                    <Link
                      key={c}
                      href={filterUrl("city", c, active)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        active
                          ? "bg-[#1565C0] text-white border-[#1565C0]"
                          : "bg-white text-[#555] border-[#d0d5dd] hover:border-[#888]"
                      }`}
                    >
                      {c}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Degree */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5768] flex items-center gap-1.5">
                <GraduationCap size={12} className="text-[#4B5768]" />
                Qualification
              </span>
              <div className="flex flex-col gap-0.5">
                {canonicalDegrees.map((d) => {
                  const active = degree === d;
                  return (
                    <Link
                      key={d}
                      href={filterUrl("degree", d, active)}
                      className={`py-1.5 px-2.5 text-xs rounded transition-colors ${
                        active
                          ? "bg-[#1565C0] text-white font-semibold"
                          : "text-[#555] hover:bg-white hover:text-[#1a1a2e]"
                      }`}
                    >
                      {d}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Job Type */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B5768] flex items-center gap-1.5">
                <Briefcase size={12} className="text-[#4B5768]" />
                Type
              </span>
              <div className="flex flex-wrap gap-1.5">
                {canonicalJobTypes.map((jt) => {
                  const active = jobType === jt;
                  return (
                    <Link
                      key={jt}
                      href={filterUrl("jobType", jt, active)}
                      className={`px-2.5 py-1 text-xs rounded border capitalize transition-colors ${
                        active
                          ? "bg-[#1565C0] text-white border-[#1565C0]"
                          : "bg-white text-[#555] border-[#d0d5dd] hover:border-[#888]"
                      }`}
                    >
                      {jt}
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Job grid */}
          <main className="flex-1 w-full min-w-0">
            <div className="bg-[#1565C0] rounded-t px-4 py-2 mb-0">
              <h1 className="text-[13px] font-bold text-white uppercase tracking-wider">
                {pageTitle}
              </h1>
            </div>
            <div className="bg-white border border-[#d0d5dd] border-t-0 rounded-b p-4 mb-4">
              <span className="text-xs text-[#888] tabular-nums">{jobs.length} results</span>
            </div>

            <PublicJobList jobs={jobs} />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#ddd] bg-white text-[#666] py-6 text-xs">
        <div className="max-w-[1200px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#1a1a2e]">
              FRESHER<span className="text-[#E8873A]">PORTAL</span>
            </span>
            <span className="text-[#94A3B8]">•</span>
            <span>Verified Off-Campus Aggregator</span>
          </div>

          <div className="flex items-center gap-5 text-xs font-medium">
            <Link
              href="/disclaimer"
              className="hover:text-[#0F1729] transition-colors"
            >
              Disclaimer
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[#0F1729] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/report"
              className="hover:text-[#0F1729] transition-colors"
            >
              Report a Job
            </Link>
            <Link
              href="/admin"
              className="text-[#94A3B8] hover:text-[#4B5768] transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
