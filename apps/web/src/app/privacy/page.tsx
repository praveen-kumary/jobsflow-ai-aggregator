import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="prose text-sm text-[#4B5768] leading-relaxed space-y-4">
          <p>
            At FresherPortal, we respect your privacy. This policy explains what information we collect and how it is used.
          </p>
          <h2 className="text-base font-bold text-[#0F1729]">Information Collection</h2>
          <p>
            We do not require candidate account registration to browse or search job postings. We record aggregate anonymous metrics (page views, search filters applied, and outbound apply link clicks) solely to optimize user experience and identify active hiring trends.
          </p>
          <h2 className="text-base font-bold text-[#0F1729]">External Career Links</h2>
          <p>
            Our job detail pages contain links directing users to official employer career portals. When you click an external link, you leave our platform and become subject to the privacy practices of that employer.
          </p>
          <h2 className="text-base font-bold text-[#0F1729]">Contact</h2>
          <p>
            For privacy inquiries, contact us via our{" "}
            <Link href="/report" className="text-[#E8873A] font-semibold underline">
              Report & Contact page
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
