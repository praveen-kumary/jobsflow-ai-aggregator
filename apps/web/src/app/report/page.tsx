"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";

export default function ReportJobPage() {
  const [submitted, setSubmitted] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("expired");
  const [details, setDetails] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#0F1729]">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#4B5768] hover:text-[#0F1729] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F1729]">
            Report a Listing / Takedown Request
          </h1>
          <p className="text-xs text-[#4B5768] mt-1">
            Promptly flag an expired listing, inaccurate criteria, or request immediate takedown.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white border border-[#1F7A5C]/40 rounded-xl p-8 text-center space-y-3">
            <CheckCircle2 size={36} className="text-[#1F7A5C] mx-auto" />
            <h2 className="font-bold text-lg text-[#0F1729]">Report Submitted</h2>
            <p className="text-xs text-[#4B5768] max-w-sm mx-auto">
              Our operator team reviews flagged postings daily and will update or remove the listing within 24 hours.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-[#0F1729] text-white text-xs font-bold rounded-md"
            >
              Return to Job Board
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#E4E1D9] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5768] mb-1">
                Job Posting URL or Role Title *
              </label>
              <input
                type="text"
                required
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://... or Company & Role name"
                className="w-full bg-[#FAFAF7] border border-[#E4E1D9] rounded-lg px-3.5 py-2 text-xs text-[#0F1729] focus:outline-none focus:border-[#0F1729]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5768] mb-1">
                Your Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com or candidate@gmail.com"
                className="w-full bg-[#FAFAF7] border border-[#E4E1D9] rounded-lg px-3.5 py-2 text-xs text-[#0F1729] focus:outline-none focus:border-[#0F1729]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5768] mb-1">
                Reason for Report *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#FAFAF7] border border-[#E4E1D9] rounded-lg px-3.5 py-2 text-xs text-[#0F1729] focus:outline-none focus:border-[#0F1729]"
              >
                <option value="expired">Application Link Expired / Role Closed</option>
                <option value="takedown">Employer Takedown Request</option>
                <option value="inaccurate">Inaccurate Eligibility or CTC Details</option>
                <option value="scam">Suspected Fraud / Unofficial Portal</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5768] mb-1">
                Additional Notes
              </label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any additional details or official career link..."
                className="w-full bg-[#FAFAF7] border border-[#E4E1D9] rounded-lg p-3 text-xs text-[#0F1729] focus:outline-none focus:border-[#0F1729]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#E8873A] hover:bg-[#d4752c] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow"
            >
              <Send size={13} />
              <span>Submit Report</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
