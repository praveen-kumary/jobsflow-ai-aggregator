"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  SplitSquareVertical,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react";

export function JobEditorClient({ job }: { job: any }) {
  const router = useRouter();

  const [company, setCompany] = useState(job.company);
  const [role, setRole] = useState(job.role);
  const [description, setDescription] = useState(job.description);
  const [applyUrl, setApplyUrl] = useState(job.applyUrl);
  const [jobType, setJobType] = useState(job.jobType);
  const [functionalArea, setFunctionalArea] = useState(job.functionalArea || "");
  const [experienceMin, setExperienceMin] = useState(job.experienceMin ?? 0);
  const [experienceMax, setExperienceMax] = useState(job.experienceMax ?? 1);
  const [salaryText, setSalaryText] = useState(job.salaryText || "");
  const [status, setStatus] = useState(job.status);

  // Arrays
  const [batchYears, setBatchYears] = useState<string[]>(job.batchYears || []);
  const [cities, setCities] = useState<string[]>(job.city || []);
  const [degrees, setDegrees] = useState<string[]>(job.degree || []);

  // Deadline
  const [deadline, setDeadline] = useState<string>(
    job.deadline ? new Date(job.deadline).toISOString().split("T")[0] : ""
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);
  const [showRawDiff, setShowRawDiff] = useState(true);

  async function handleOptimizeWithAi() {
    setOptimizing(true);
    setOptimizeMessage(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.description) {
        setDescription(data.description);
        setOptimizeMessage("Optimized into clean recruiter-grade sections (Overview, Eligibility, Responsibilities, Skills, How to Apply)!");
        setTimeout(() => setOptimizeMessage(null), 6000);
      } else {
        alert(data.error || "Failed to optimize description");
      }
    } catch (err: any) {
      console.error("AI optimize error:", err);
      alert("Failed to contact optimization endpoint.");
    } finally {
      setOptimizing(false);
    }
  }

  // Quick deadline helpers
  function addDaysToDeadline(days: number) {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setDeadline(d.toISOString().split("T")[0]);
  }

  function toggleArrayItem(arr: string[], item: string, setter: (a: string[]) => void) {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  }

  async function handleSave(newStatus?: string) {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const finalStatus = newStatus || status;
      const res = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          description,
          applyUrl,
          jobType,
          functionalArea: functionalArea || null,
          experienceMin: Number(experienceMin),
          experienceMax: Number(experienceMax),
          salaryText: salaryText || null,
          status: finalStatus,
          batchYears,
          city: cities,
          degree: degrees,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          ...(finalStatus === "published" && !job.publishedAt
            ? { publishedAt: new Date().toISOString() }
            : {}),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (newStatus) setStatus(newStatus);
        router.refresh();
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  const allBatches = ["2023", "2024", "2025", "2026", "2027"];
  const allCities = ["Bangalore", "Hyderabad", "Pune", "Chennai", "Noida", "Gurgaon", "Mumbai", "Delhi", "Remote", "Pan India"];
  const allDegrees = ["B.E/B.Tech", "M.E/M.Tech/M.S", "BCA/MCA", "B.Sc/M.Sc", "Any Degree"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#242731] pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/jobs"
            className="p-1.5 bg-[#1F2128] hover:bg-[#2A2D37] text-[#86888F] hover:text-white rounded border border-[#2E313C] transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">Edit Job Posting</h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  status === "published"
                    ? "bg-[#3FA66B]/20 text-[#3FA66B] border border-[#3FA66B]/40"
                    : status === "draft"
                    ? "bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40"
                    : "bg-[#5B5D66]/20 text-[#86888F]"
                }`}
              >
                {status}
              </span>
              {job.categoryConfidence !== "high" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D6553D]/20 text-[#D6553D] border border-[#D6553D]/30 flex items-center gap-1">
                  <AlertTriangle size={10} /> Confidence: {job.categoryConfidence}
                </span>
              )}
            </div>
            <span className="text-xs text-[#86888F]">ID: {job.id} • Slug: {job.slug}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <span className="text-xs text-[#3FA66B] flex items-center gap-1 font-semibold animate-fade-in">
              <CheckCircle2 size={13} /> Saved!
            </span>
          )}

          <button
            type="button"
            onClick={handleOptimizeWithAi}
            disabled={optimizing}
            className="px-3.5 py-2 bg-purple-950/40 hover:bg-purple-900/60 text-xs font-semibold text-purple-200 rounded-md border border-purple-700/50 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Automatically format raw content into clean Overview, Eligibility, Responsibilities, Skills, and How to Apply"
          >
            {optimizing ? (
              <Loader2 size={13} className="animate-spin text-purple-400" />
            ) : (
              <Sparkles size={13} className="text-purple-400" />
            )}
            <span>{optimizing ? "Optimizing..." : "⚡ Optimize with AI"}</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 bg-[#252830] hover:bg-[#30333E] text-xs font-semibold text-white rounded-md border border-[#343844] transition-colors flex items-center gap-1.5"
          >
            <Save size={13} />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="px-5 py-2 bg-[#3FA66B] hover:bg-[#348a58] text-xs font-bold text-white rounded-md transition-colors shadow flex items-center gap-1.5"
          >
            <CheckCircle2 size={13} />
            <span>Publish Live</span>
          </button>
        </div>
      </div>

      {optimizeMessage && (
        <div className="p-3.5 bg-purple-950/30 border border-purple-600/40 rounded-lg text-xs text-purple-200 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-purple-400 shrink-0" />
            <span>{optimizeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setOptimizeMessage(null)}
            className="text-purple-300 hover:text-white text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Title, Details, Description Side-by-Side Diff */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Inputs */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#86888F] mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2D3139] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#3FA66B]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#86888F] mb-1">
                  Role Title
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2D3139] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#3FA66B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#86888F] mb-1">
                Official Career / Application URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  className="flex-1 bg-[#121316] border border-[#2D3139] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#3FA66B]"
                />
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-[#252830] hover:bg-[#30333E] text-[#86888F] hover:text-white rounded border border-[#343844] transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Side-by-Side Raw vs Cleaned Description Diff (Section 9) */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
              <div className="flex items-center space-x-2">
                <SplitSquareVertical size={16} className="text-[#3FA66B]" />
                <h3 className="text-sm font-bold text-white">
                  Content Diff & Inspection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRawDiff(!showRawDiff)}
                className="text-xs text-[#86888F] hover:text-white"
              >
                {showRawDiff ? "Hide Raw Scraped Text" : "Show Side-by-Side Raw Text"}
              </button>
            </div>

            <div className={`grid ${showRawDiff ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4`}>
              {/* Clean LLM Rewritten Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3FA66B] mb-1">
                  Rewritten Public Description (Markdown)
                </label>
                <textarea
                  rows={14}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2D3139] rounded-lg p-3 text-xs text-[#EDEDEF] font-mono leading-relaxed focus:outline-none focus:border-[#3FA66B]"
                />
              </div>

              {/* Raw Scraped Text (For Operator Audit) */}
              {showRawDiff && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#86888F] mb-1">
                    Raw Original Scraped HTML / Text (Audit Only)
                  </label>
                  <div className="w-full h-[280px] overflow-y-auto bg-[#141518] border border-[#272932] rounded-lg p-3 text-[11px] font-mono text-[#86888F] leading-relaxed select-all">
                    {job.descriptionRaw || "No raw text recorded."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Taxonomy Multi-Select Chips & Deadline Editor */}
        <div className="space-y-6">
          {/* Deadline & Expiry Controls */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#2D3139] pb-2">
              <Clock size={15} className="text-[#E8873A]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Application Deadline
              </h3>
            </div>

            <div>
              <label className="block text-xs text-[#86888F] mb-1">Closing Date</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E8873A]"
              />
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#86888F]">Presets:</span>
              <button
                type="button"
                onClick={() => addDaysToDeadline(7)}
                className="px-2 py-0.5 bg-[#252830] hover:bg-[#30333E] rounded text-[10px] text-[#EDEDEF] border border-[#343844]"
              >
                +7 Days
              </button>
              <button
                type="button"
                onClick={() => addDaysToDeadline(15)}
                className="px-2 py-0.5 bg-[#252830] hover:bg-[#30333E] rounded text-[10px] text-[#EDEDEF] border border-[#343844]"
              >
                +15 Days
              </button>
              <button
                type="button"
                onClick={() => addDaysToDeadline(30)}
                className="px-2 py-0.5 bg-[#252830] hover:bg-[#30333E] rounded text-[10px] text-[#EDEDEF] border border-[#343844]"
              >
                +30 Days
              </button>
            </div>
          </div>

          {/* Taxonomy Chips: Batch Year */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#86888F]">
              Eligible Batches
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allBatches.map((b) => {
                const selected = batchYears.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleArrayItem(batchYears, b, setBatchYears)}
                    className={`px-2.5 py-1 text-xs rounded border tabular-nums transition-colors ${
                      selected
                        ? "bg-[#3FA66B] text-white border-[#3FA66B] font-bold"
                        : "bg-[#121316] text-[#86888F] border-[#2D3139] hover:border-[#86888F]"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taxonomy Chips: Cities */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#86888F]">
              Locations
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allCities.map((c) => {
                const selected = cities.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleArrayItem(cities, c, setCities)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      selected
                        ? "bg-[#3FA66B] text-white border-[#3FA66B] font-bold"
                        : "bg-[#121316] text-[#86888F] border-[#2D3139] hover:border-[#86888F]"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taxonomy Chips: Degrees */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#86888F]">
              Degrees
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allDegrees.map((d) => {
                const selected = degrees.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleArrayItem(degrees, d, setDegrees)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      selected
                        ? "bg-[#3FA66B] text-white border-[#3FA66B] font-bold"
                        : "bg-[#121316] text-[#86888F] border-[#2D3139] hover:border-[#86888F]"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
