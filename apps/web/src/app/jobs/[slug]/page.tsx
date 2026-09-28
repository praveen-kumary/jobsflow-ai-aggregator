import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Calendar,
  Briefcase,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import type { Metadata } from "next";
import { PublicNavbar } from "@/components/navbar";
import { CompanyLogo } from "@/components/company-logo";
import { StickyApplyBar } from "@/components/sticky-apply-bar";
import { AdPlaceholder } from "@/components/ad-slot";
import { getWhatsAppUrl, getTelegramUrl } from "@/lib/site-config";

export const revalidate = 60;

/* ─── Metadata ─── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await prisma.job.findUnique({
    where: { slug },
    select: { company: true, role: true, city: true, batchYears: true },
  });
  if (!job) return { title: "Job Not Found" };
  const c = job.city.join(", ") || "India";
  const b = job.batchYears.join(", ");
  return {
    title: `${job.company} Recruitment ${b} – ${job.role} | ${c} | Off Campus Drive`,
    description: `Apply for ${job.role} at ${job.company} (${c}). ${b} Batch. Verified off-campus opening. Direct ATS link.`,
    openGraph: {
      title: `${job.company} – ${job.role} | FresherPortal`,
      description: `${job.role} at ${job.company}. ${c}. ${b} Batch.`,
    },
  };
}

/* ─── Page ─── */
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [job, latestJobs] = await Promise.all([
    prisma.job.findUnique({ where: { slug } }),
    prisma.job.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        company: true,
        companyNormalized: true,
        role: true,
        slug: true,
        city: true,
        batchYears: true,
        createdAt: true,
      },
    }),
  ]);

  if (!job) notFound();

  // Load social URLs from SiteConfig
  const [whatsappUrl, telegramUrl] = await Promise.all([getWhatsAppUrl(), getTelegramUrl()]);

  // fire-and-forget view count
  prisma.job
    .update({ where: { id: job.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  // deadline
  let daysLeft: number | null = null;
  let isUrgent = false;
  if (job.deadline) {
    const ms = new Date(job.deadline).getTime() - Date.now();
    daysLeft = Math.ceil(ms / 86400000);
    if (daysLeft <= 3 && daysLeft >= 0) isUrgent = true;
  }

  const desc = job.descriptionFromApply || job.descriptionFromSource || job.description;
  const sections = splitSections(desc);

  const relatedJobs = await prisma.job.findMany({
    where: {
      status: "published",
      id: { not: job.id },
      OR: [
        { companyNormalized: job.companyNormalized },
        { batchYears: { hasSome: job.batchYears } },
      ],
    },
    take: 9,
    orderBy: { createdAt: "desc" },
    select: {
      company: true,
      companyNormalized: true,
      role: true,
      city: true,
      slug: true,
      batchYears: true,
    },
  });

  const faqs = makeFAQs(job);
  const applyHref = `/api/jobs/${job.id}/apply`;
  const sideJobs = latestJobs.filter((j) => j.slug !== slug);

  const cityStr = job.city.join(", ") || "Pan India";
  const batchStr = job.batchYears.join(", ");
  const degreeStr = job.degree.length > 0 ? job.degree.join(", ") : "Any Degree";
  const expStr =
    job.experienceMin === 0 && (job.experienceMax === 0 || job.experienceMax === null)
      ? "Freshers (0 years)"
      : `${job.experienceMin ?? 0}–${job.experienceMax ?? "5+"} years`;
  const datePosted = new Date(job.publishedAt || job.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const deadlineStr = job.deadline
    ? new Date(job.deadline).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not Specified";

  /* JSON-LD */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.role,
    description: desc.replace(/\n/g, "<br>"),
    datePosted: (job.publishedAt ?? job.createdAt).toISOString(),
    ...(job.deadline && { validThrough: job.deadline.toISOString() }),
    employmentType: job.jobType === "internship" ? "INTERN" : "FULL_TIME",
    hiringOrganization: { "@type": "Organization", name: job.company },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.city[0] || "India", addressCountry: "IN" },
    },
    directApply: true,
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#edf0f5]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <PublicNavbar />

      {/* ═══ TOP AD BANNER (full-width, like competitor) ═══ */}
      <div className="border-b border-[#ddd] bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <AdPlaceholder label="Ad" minHeight={90} className="my-2" />
        </div>
      </div>

      {/* ═══ Social CTA strip ═══ */}
      <div className="bg-white border-b border-[#ddd]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <a href="#" className="w-full sm:w-auto text-center px-5 py-2.5 border-2 border-[#25D366] text-[#25D366] font-bold text-[13px] rounded hover:bg-[#25D366]/5 transition-colors">
            👉 Join Our WhatsApp Channel for Free Job Alerts
          </a>
          <a href="#" className="w-full sm:w-auto text-center px-5 py-2.5 border-2 border-[#0088cc] text-[#0088cc] font-bold text-[13px] rounded hover:bg-[#0088cc]/5 transition-colors">
            🚀 Join Our Telegram Group for Free Job Alerts
          </a>
        </div>
      </div>

      {/* ═══ 2-Column Layout ═══ */}
      <div className="max-w-[1200px] mx-auto px-4 py-5">
        <div className="lg:flex lg:gap-7">

          {/* ━━━ MAIN CONTENT ━━━ */}
          <article className="lg:flex-1 min-w-0">

            {/* H1 */}
            <h1 className="text-[22px] sm:text-[28px] font-extrabold text-[#1a1a2e] leading-snug mb-1">
              {job.company} Recruitment {batchStr} – {job.role} | {cityStr}
            </h1>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-[11px] text-[#888] mb-4">
              <Link href="/" className="hover:text-[#333]">Home</Link>
              <ChevronRight size={10} />
              <Link href="/" className="hover:text-[#333]">Off Campus Jobs</Link>
              <ChevronRight size={10} />
              <span className="text-[#333] font-medium">{job.company}</span>
            </nav>

            {/* ── Highlight pills (like competitor) ── */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                job.jobType === "internship" ? "Internship Opportunity" : "Full-time Position",
                `${batchStr} Batch`,
                `${cityStr}`,
                daysLeft !== null && daysLeft >= 0
                  ? isUrgent
                    ? `⚠️ ${daysLeft}d left — Apply Fast!`
                    : `${daysLeft} days remaining`
                  : null,
              ]
                .filter(Boolean)
                .map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1.5 bg-white border border-[#d0d5dd] text-[12px] font-semibold text-[#333] rounded"
                  >
                    {pill}
                  </span>
                ))}
            </div>

            {/* ── Intro paragraph (like competitor's opening text) ── */}
            <h2 className="text-[16px] sm:text-[20px] font-extrabold text-[#1a1a2e] mb-2">
              {job.company} Recruitment {batchStr} – {job.role} | {cityStr}
            </h2>
            <p className="text-[13px] sm:text-sm text-[#444] leading-relaxed mb-4">
              <strong>{job.company} Recruitment {batchStr}</strong> is hiring for the position of{" "}
              <strong>{job.role}</strong> in {cityStr}. The role is a{" "}
              <strong>{job.jobType === "internship" ? "internship" : "full-time"}</strong> opportunity
              {job.degree.length > 0 && <> for candidates with <strong>{degreeStr}</strong> qualifications</>}.
              {job.salaryText && <> The offered compensation is <strong>{job.salaryText}</strong>.</>}
            </p>

            {/* ── Inline Social CTA (competitor puts these INSIDE the content) ── */}
            <div className="flex flex-col items-center gap-2.5 my-5">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto text-center px-6 py-2.5 border-2 border-[#25D366] text-[#25D366] font-bold text-[13px] rounded hover:bg-[#25D366]/5 transition-colors">
                👉 Join Our WhatsApp Channel for Free Job Alerts
              </a>
              <a href={telegramUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto text-center px-6 py-2.5 border-2 border-[#0088cc] text-[#0088cc] font-bold text-[13px] rounded hover:bg-[#0088cc]/5 transition-colors">
                🚀 Join Our Telegram Group for Free Job Alerts
              </a>
            </div>

            {/* ── AD after intro ── */}
            <AdPlaceholder label="Ad" minHeight={90} className="mb-5" />

            {/* ── JOB DETAILS TABLE ── */}
            <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
              {job.company} Recruitment {batchStr} – Job Details
            </h2>
            <table className="w-full text-[13px] sm:text-sm border border-[#d0d5dd] bg-white mb-5">
              <tbody>
                {([
                  ["Company", job.company],
                  ["Job Role", job.role],
                  ["Job Type", job.jobType === "internship" ? "Internship" : "Full Time"],
                  ["Qualification", degreeStr],
                  ["Experience", expStr],
                  ["Job Location", cityStr],
                  ["Batch", batchStr],
                  ...(job.salaryText ? [["Salary / CTC", job.salaryText]] : []),
                  ["Posted", datePosted],
                  ["Last Date", deadlineStr],
                ] as [string, string][]).map(([k, v], i) => (
                  <tr key={k} className={i % 2 === 0 ? "bg-white" : "bg-[#f7f8fa]"}>
                    <td className="px-3 sm:px-4 py-2.5 font-bold text-[#1a1a2e] border-b border-[#e5e7eb] w-[120px] sm:w-[160px]">{k}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#444] border-b border-[#e5e7eb]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── ELIGIBILITY ── */}
            <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
              {job.company} {job.role} Eligibility
            </h2>
            <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
              <p className="mb-3">
                Candidates interested in the <strong>{job.role}</strong> role at <strong>{job.company}</strong> must
                meet the following eligibility criteria:
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Qualification:</strong> {degreeStr}</li>
                <li><strong>Batch:</strong> {batchStr} passouts</li>
                <li><strong>Experience:</strong> {expStr}</li>
                {job.city.length > 0 && <li><strong>Location:</strong> {cityStr}</li>}
                {job.salaryText && <li><strong>Salary:</strong> {job.salaryText}</li>}
              </ul>
            </div>


            {/* No ad here — competitor keeps eligibility → description flow uninterrupted */}

            {/* ── DETAILED ELIGIBILITY (rich content) ── */}
            {job.eligibilityDetailed && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  {job.company} {job.role} Eligibility
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
                  <p className="mb-3">
                    Candidates interested in the <strong>{job.role}</strong> role at <strong>{job.company}</strong> must meet the following eligibility criteria:
                  </p>
                  <div className="space-y-2">
                    {job.eligibilityDetailed.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[#1565C0] mt-0.5 shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/^\s*-\s*/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── DETAILED RESPONSIBILITIES (rich content) ── */}
            {job.responsibilitiesDetailed && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  {job.company} {job.role} Responsibilities
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
                  <div className="space-y-2">
                    {job.responsibilitiesDetailed.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[#1565C0] mt-0.5 shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/^\s*-\s*/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── SKILLS & TOOLS (rich content) ── */}
            {job.skillsTools && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  Tools and Technologies for {job.company} {job.role}
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
                  {job.skillsTools.split("\n\n").map((section, si) => (
                    <div key={si} className={si > 0 ? "mt-4" : ""}>
                      {section.split("\n").map((line, li) => {
                        const trimmed = line.trim();
                        if (trimmed.endsWith(":") && !trimmed.startsWith("-")) {
                          return <h3 key={li} className="font-bold text-[#1a1a2e] mb-2 mt-2">{trimmed}</h3>;
                        }
                        if (trimmed.startsWith("-")) {
                          return (
                            <div key={li} className="flex gap-2 ml-2">
                              <span className="text-[#1565C0] mt-0.5 shrink-0">•</span>
                              <span>{trimmed.replace(/^\s*-\s*/, "")}</span>
                            </div>
                          );
                        }
                        return trimmed ? <p key={li}>{trimmed}</p> : null;
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── AD between content sections ── */}
            <AdPlaceholder label="Ad" minHeight={90} className="mb-5" />

            {/* ── PREPARATION TIPS (rich content) ── */}
            {job.preparationTips && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  How to Prepare for {job.company} {job.role} Interview
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
                  {job.preparationTips.split("\n\n").map((tip, i) => {
                    const lines = tip.split("\n");
                    const title = lines[0]?.trim();
                    const body = lines.slice(1).join("\n").trim();
                    return (
                      <div key={i} className={i > 0 ? "mt-4" : ""}>
                        <h3 className="font-bold text-[#1a1a2e] mb-1" dangerouslySetInnerHTML={{ __html: title.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                        {body && <p className="text-[#555]">{body}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── IMPORTANT POINTS (rich content) ── */}
            {job.importantPoints && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  Important Points About {job.company} Recruitment {batchStr}
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
                  <div className="space-y-2">
                    {job.importantPoints.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[#1565C0] mt-0.5 shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/^\s*-\s*/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── ABOUT COMPANY (rich content) ── */}
            {job.aboutCompany && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  About {job.company}
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed whitespace-pre-line">
                  {job.aboutCompany}
                </div>
              </>
            )}

            {/* ── CAREER GROWTH (rich content) ── */}
            {job.careerGrowth && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  Start Your Career at {job.company}
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed whitespace-pre-line">
                  {job.careerGrowth}
                </div>
              </>
            )}

            {/* ── DISCLAIMER ── */}
            <div className="bg-[#f7f8fa] border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[12px] text-[#666] leading-relaxed">
              <p className="mb-2">
                <strong>Disclaimer:</strong> The information provided above is based on the job details supplied for the {job.company} {job.role} position and is intended for informational purposes. Candidates should verify the latest eligibility criteria, application status, salary, location and other details on the official {job.company} careers portal before applying.
              </p>
              <p>
                <strong>Verified ✓</strong> — This job post has been checked from the company's official career page or authorized source at the time of publishing. Applicants are advised to verify details before applying.
              </p>
            </div>

            {/* ── INTERNAL LINKS (SEO) ── */}
            <div className="mb-5">
              <h3 className="text-sm font-bold text-[#1a1a2e] mb-2">Related Job Searches:</h3>
              <div className="flex flex-wrap gap-2">
                {job.batchYears.map(b => (
                  <Link key={b} href={`/?batch=${b}`} className="text-xs text-[#1565C0] hover:underline">
                    {b} Batch Off Campus Jobs
                  </Link>
                ))}
                {job.degree.map(d => (
                  <Link key={d} href={`/?degree=${encodeURIComponent(d)}`} className="text-xs text-[#1565C0] hover:underline">
                    {d} Off Campus Jobs
                  </Link>
                ))}
                {job.city.map(c => (
                  <Link key={c} href={`/?city=${encodeURIComponent(c)}`} className="text-xs text-[#1565C0] hover:underline">
                    {c} Off Campus Jobs
                  </Link>
                ))}
              </div>
            </div>

            {/* ── AD before how-to-apply ── */}
            <AdPlaceholder label="Ad" minHeight={90} className="mb-5" />

            {/* ── FULL DESCRIPTION (structured or raw — fallback if no rich content) ── */}
            {(!job.eligibilityDetailed && !job.responsibilitiesDetailed) && (
              <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
                {sections.length > 0 ? (
                  sections.map((s, i) => (
                    <div key={i} className={i > 0 ? "mt-5" : ""}>
                      {s.heading && (
                        <h3 className="text-[16px] sm:text-[18px] font-bold text-[#1a1a2e] mb-2">{s.heading}</h3>
                      )}
                      <div className="whitespace-pre-line">{s.body}</div>
                    </div>
                  ))
                ) : (
                  <>
                    <h3 className="text-[16px] sm:text-[18px] font-bold text-[#1a1a2e] mb-2">
                      Job Description &amp; Responsibilities
                    </h3>
                    <div className="whitespace-pre-line">{desc}</div>
                  </>
                )}
              </div>
            )}

            {/* ── HOW TO APPLY ── */}
            <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
              How to Apply for {job.company} {job.role}
            </h2>
            <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444] leading-relaxed">
              <ol className="list-decimal list-inside space-y-2">
                <li>Click the <strong>"Apply Now"</strong> button below to visit {job.company}'s official career page.</li>
                <li>Create an account or log in on the company portal.</li>
                <li>Search for <strong>"{job.role}"</strong> if not automatically redirected.</li>
                <li>Fill in your personal details, education, and work experience.</li>
                <li>Upload your latest resume and submit the application.</li>
              </ol>
            </div>

            {/* ── APPLY BUTTON (bottom only — competitor pattern) ── */}
            <a
              href={applyHref}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center py-4 rounded bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold text-lg tracking-wide shadow-sm transition-colors mb-1"
            >
              Click Here to Apply ↗
            </a>
            <p className="text-[11px] text-[#999] mb-5">
              You will be redirected to {job.company}'s official career portal.
            </p>

            {/* ── AD after apply ── */}
            <AdPlaceholder label="Ad" minHeight={90} className="mb-5" />

            {/* ── FAQs ── */}
            {faqs.length > 0 && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  Frequently Asked Questions
                </h2>
                <div className="bg-white border border-[#d0d5dd] rounded p-4 sm:p-5 mb-5 text-[13px] sm:text-sm text-[#444]">
                  {faqs.map((faq, i) => (
                    <div key={i} className={`${i > 0 ? "mt-4 pt-4 border-t border-[#eee]" : ""}`}>
                      <h3 className="font-bold text-[#1a1a2e] mb-1">Q{i + 1}. {faq.q}</h3>
                      <p className="leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── RELATED JOBS 3-col grid (like competitor's "You may have missed") ── */}
            {relatedJobs.length > 0 && (
              <>
                <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#1a1a2e] mb-3">
                  You May Also Like
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  {relatedJobs.map((rj) => (
                    <div key={rj.slug} className="bg-white border border-[#d0d5dd] rounded p-4 flex flex-col items-center text-center">
                      <CompanyLogo company={rj.company} companyNormalized={rj.companyNormalized} size={52} />
                      <p className="text-[12px] font-bold text-[#1a1a2e] mt-2 leading-snug">
                        {rj.company} – {rj.role}
                      </p>
                      <p className="text-[10px] text-[#888] mt-0.5">
                        {rj.city.slice(0, 2).join(", ")} · {rj.batchYears.join(", ")} Batch
                      </p>
                      <Link
                        href={`/jobs/${rj.slug}`}
                        className="mt-2.5 px-5 py-1.5 bg-[#1565C0] text-white text-[11px] font-bold rounded hover:bg-[#0D47A1] transition-colors"
                      >
                        Apply Now
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Mobile: Latest Jobs ── */}
            <div className="lg:hidden mt-4 mb-3">
              <LatestJobsList jobs={sideJobs.slice(0, 8)} title="More Openings" />
            </div>

            <p className="text-[10px] text-[#aaa] text-center py-2">
              Verify details on the official career portal before applying.
              FresherPortal only aggregates and verifies listings.
            </p>
          </article>

          {/* ━━━ SIDEBAR (desktop only) ━━━ */}
          <aside className="hidden lg:block w-[320px] shrink-0">
            <div className="sticky top-16 space-y-5">
              {/* LATEST JOBS */}
              <LatestJobsList jobs={sideJobs} title="Latest Jobs" />

              {/* Sidebar Ad */}
              <AdPlaceholder label="Ad 300×250" minHeight={250} />

              {/* Second sidebar ad lower */}
              <AdPlaceholder label="Ad 300×250" minHeight={250} />
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile bar */}
      <StickyApplyBar company={job.company} applyUrl={applyHref} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LATEST JOBS LIST COMPONENT (reused for sidebar + mobile)
   ═══════════════════════════════════════════════════════ */
function LatestJobsList({ jobs, title }: { jobs: any[]; title: string }) {
  return (
    <div className="border border-[#d0d5dd] rounded overflow-hidden bg-white">
      <div className="bg-[#1565C0] px-4 py-2">
        <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-[#eee] max-h-[700px] overflow-y-auto">
        {jobs.map((j: any) => (
          <Link
            key={j.slug}
            href={`/jobs/${j.slug}`}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#f5f7fa] transition-colors"
          >
            <CompanyLogo company={j.company} companyNormalized={j.companyNormalized} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-[#1a1a2e] leading-tight line-clamp-2">
                {j.company} – {j.role}
              </p>
              <p className="text-[9px] text-[#999] mt-0.5">
                {new Date(j.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
interface Section {
  heading: string | null;
  body: string;
}

function splitSections(text: string): Section[] {
  if (!text || text.length < 80) return [];
  const lines = text.split("\n");
  const out: Section[] = [];
  let h: string | null = null;
  let buf: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    const isH =
      (t.length > 3 && t.length < 80 && t.endsWith(":")) ||
      (t.length > 3 && t.length < 60 && t === t.toUpperCase() && /[A-Z]/.test(t)) ||
      /^#{1,3}\s/.test(t);
    if (isH) {
      if (buf.length || h) out.push({ heading: h, body: buf.join("\n").trim() });
      h = t.replace(/^#{1,3}\s*/, "").replace(/:$/, "").trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  if (buf.length || h) out.push({ heading: h, body: buf.join("\n").trim() });
  return out.length > 1 ? out : [];
}

function makeFAQs(job: {
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  degree: string[];
  jobType: string;
  salaryText: string | null;
}) {
  const c = job.city.join(", ") || "multiple locations";
  const b = job.batchYears.join(", ");
  const d = job.degree.length > 0 ? job.degree.join(", ") : "any degree";
  const t = job.jobType === "internship" ? "internship" : "full-time position";
  return [
    {
      q: `What is the eligibility for ${job.company} ${job.role}?`,
      a: `Candidates from the ${b} batch with ${d} qualifications are eligible for this ${t}. The role is based in ${c}.`,
    },
    {
      q: `How to apply for ${job.company} Off Campus Drive?`,
      a: `Click the "Apply Now" button on this page to be redirected to ${job.company}'s official career portal. Create an account, fill in your details, upload your resume, and submit.`,
    },
    {
      q: `What is the salary for ${job.role} at ${job.company}?`,
      a: job.salaryText
        ? `The salary is ${job.salaryText}. Final package varies based on qualifications and interview performance.`
        : `Salary details have not been disclosed by ${job.company}. Such ${t}s typically offer competitive compensation.`,
    },
    {
      q: `Is this a verified job opening?`,
      a: `Yes, verified by FresherPortal. The apply link directs you to ${job.company}'s official career page.`,
    },
  ];
}
