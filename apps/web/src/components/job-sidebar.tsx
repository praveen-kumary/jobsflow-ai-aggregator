import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Building,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  Clock,
  DollarSign,
} from "lucide-react";
import { CompanyLogo } from "./company-logo";
import { AdPlaceholder } from "./ad-slot";

// ── Job Summary Table ──────────────────────────────────────────

interface JobSummaryProps {
  company: string;
  companyNormalized: string;
  city: string[];
  batchYears: string[];
  degree: string[];
  jobType: string;
  salaryText: string | null;
  deadline: Date | null;
  experienceMin: number | null;
  experienceMax: number | null;
}

export function JobSummaryTable(props: JobSummaryProps) {
  const rows = [
    {
      icon: Building,
      label: "Company",
      value: props.company,
    },
    {
      icon: MapPin,
      label: "Location",
      value: props.city.length > 0 ? props.city.join(", ") : "Pan India",
    },
    {
      icon: Calendar,
      label: "Batch",
      value: props.batchYears.join(", ") || "—",
    },
    {
      icon: GraduationCap,
      label: "Qualification",
      value: props.degree.length > 0 ? props.degree.join(", ") : "Any Degree",
    },
    {
      icon: Briefcase,
      label: "Job Type",
      value: props.jobType === "internship" ? "Internship" : "Full-time",
    },
    ...(props.experienceMin !== null || props.experienceMax !== null
      ? [
          {
            icon: Briefcase,
            label: "Experience",
            value:
              props.experienceMin === 0 && (props.experienceMax === 0 || props.experienceMax === null)
                ? "Freshers"
                : `${props.experienceMin ?? 0}–${props.experienceMax ?? "5+"} years`,
          },
        ]
      : []),
    ...(props.salaryText
      ? [
          {
            icon: DollarSign,
            label: "Salary",
            value: props.salaryText,
          },
        ]
      : []),
    ...(props.deadline
      ? [
          {
            icon: Clock,
            label: "Deadline",
            value: new Date(props.deadline).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-white border border-[#E4E1D9] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E4E1D9] bg-[#FAFAF7]">
        <h3 className="text-sm font-bold text-[#0F1729]">Job Details</h3>
      </div>
      <div className="divide-y divide-[#E4E1D9]/60">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3 px-4 py-2.5">
            <row.icon size={14} className="text-[#94A3B8] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                {row.label}
              </p>
              <p className="text-xs font-medium text-[#0F1729] mt-0.5">
                {row.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Latest Jobs Widget ─────────────────────────────────────────

interface LatestJob {
  company: string;
  companyNormalized: string;
  role: string;
  slug: string;
  createdAt: Date | string;
}

export function LatestJobsWidget({ jobs }: { jobs: LatestJob[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className="bg-white border border-[#E4E1D9] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E4E1D9] bg-[#FAFAF7]">
        <h3 className="text-sm font-bold text-[#0F1729]">Latest Openings</h3>
      </div>
      <div className="divide-y divide-[#E4E1D9]/40">
        {jobs.map((job) => (
          <Link
            key={job.slug}
            href={`/jobs/${job.slug}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFAF7] transition-colors group"
          >
            <CompanyLogo
              company={job.company}
              companyNormalized={job.companyNormalized}
              size={28}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-[#0F1729] truncate group-hover:text-[#E8873A] transition-colors">
                {job.company}
              </p>
              <p className="text-[10px] text-[#4B5768] truncate">
                {job.role}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/"
        className="block text-center py-2.5 text-xs font-semibold text-[#E8873A] hover:text-[#D4762A] border-t border-[#E4E1D9] hover:bg-[#FAFAF7] transition-colors"
      >
        View All Jobs →
      </Link>
    </div>
  );
}

// ── Full Sidebar Assembly ──────────────────────────────────────

interface JobSidebarProps {
  job: JobSummaryProps;
  latestJobs: LatestJob[];
  adSlotSidebar?: string;
  adPubId?: string;
}

export function JobSidebar({ job, latestJobs, adSlotSidebar, adPubId }: JobSidebarProps) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
      {/* Summary table */}
      <JobSummaryTable {...job} />

      {/* Sidebar ad slot */}
      <AdPlaceholder label="Sidebar Ad (300×250)" minHeight={250} />

      {/* Latest jobs */}
      <LatestJobsWidget jobs={latestJobs} />

      {/* Second sidebar ad (sticky area) */}
      <AdPlaceholder label="Sidebar Ad 2 (Sticky)" minHeight={250} />
    </aside>
  );
}
