"use client";

import React, { Fragment } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { AdPlaceholder } from "@/components/ad-slot";

interface JobItem {
  id: string;
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  degree: string[];
  jobType: string;
  salaryText?: string | null;
  deadline: Date | string | null;
  slug: string;
  createdAt: Date | string;
  applyUrl?: string;
}

export function PublicJobList({ jobs }: { jobs: JobItem[] }) {
  if (jobs.length === 0) {
    return (
      <div className="bg-white border border-[#d0d5dd] rounded p-10 text-center">
        <Briefcase size={28} className="text-[#d0d5dd] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#1a1a2e]">
          No openings match current filters
        </h3>
        <p className="text-xs text-[#888] mt-1">
          Try clearing filters or broadening your search.
        </p>
        <Link
          href="/"
          className="inline-block mt-3 px-4 py-1.5 bg-[#1565C0] text-white text-xs font-semibold rounded hover:bg-[#0D47A1] transition-colors"
        >
          View All Jobs
        </Link>
      </div>
    );
  }

  // Build rows of 4 with ad insertions
  const cards: React.ReactNode[] = [];

  jobs.forEach((job, index) => {
    cards.push(
      <Link
        key={job.id}
        href={`/jobs/${job.slug}`}
        className="bg-white border border-[#d0d5dd] rounded p-4 flex flex-col items-center text-center hover:border-[#999] hover:shadow-sm transition-all group"
      >
        <CompanyLogo company={job.company} size={64} />
        <h2 className="text-[12px] sm:text-[13px] font-bold text-[#1a1a2e] mt-3 leading-snug line-clamp-3 group-hover:text-[#1565C0] transition-colors">
          {job.company} Recruitment {job.batchYears.join(", ")} – {job.role} |{" "}
          {job.city.slice(0, 2).join(", ") || "Pan India"}
        </h2>
        <a
          href={`/api/jobs/${job.id}/apply`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 px-5 py-1.5 bg-[#1565C0] text-white text-[11px] font-bold rounded hover:bg-[#0D47A1] transition-colors"
        >
          Apply Now
        </a>
      </Link>
    );

    // Insert an ad row after every 8 cards
    if ((index + 1) % 8 === 0 && index < jobs.length - 1) {
      cards.push(
        <div key={`ad-${index}`} className="col-span-full">
          <AdPlaceholder label="Ad" minHeight={90} className="my-1" />
        </div>
      );
    }
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards}
    </div>
  );
}
