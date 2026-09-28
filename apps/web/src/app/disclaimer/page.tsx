import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#0F1729]">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#4B5768] hover:text-[#0F1729] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F1729]">
          Platform Disclaimer & Aggregation Notice
        </h1>

        <div className="prose text-sm text-[#4B5768] leading-relaxed space-y-4">
          <p>
            <strong>FresherPortal</strong> is an independent job aggregator and indexing platform designed to assist recent graduates and students in discovering off-campus drives, fresher hiring programs, and internships.
          </p>
          <p>
            All job listings aggregated on this platform are collected from publicly accessible company career portals, direct recruitment announcements, and authorized listings.
          </p>
          <div className="p-4 bg-[#E8873A]/10 border border-[#E8873A]/30 rounded-lg text-[#0F1729]">
            <strong>Important Notice:</strong> We do not charge candidates any fees for job applications or interview scheduling. Candidates should verify all eligibility, salary CTC, and role details directly on the employer's official career portal before applying. Never pay money to any third party claiming to offer guaranteed placements.
          </div>
          <p>
            If you represent a company and wish to update, verify, or request removal of a listing, please submit a request via our{" "}
            <Link href="/report" className="text-[#E8873A] font-semibold underline">
              Takedown & Report Form
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
