"use client";

import React, { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Globe,
  Briefcase,
  MapPin,
  Calendar,
  GraduationCap,
  DollarSign,
  Tag,
  Eye,
  Edit3,
  Layers,
  Code2,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

interface JobRow {
  id: string;
  company: string;
  role: string;
  description: string;
  descriptionRaw?: string | null;
  city: string[];
  batchYears: string[];
  degree: string[];
  jobType: string;
  functionalArea?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryText?: string | null;
  deadline?: Date | string | null;
  sourceAttribution: string | null;
  seenOnSourceIds: string[];
  categoryConfidence: string;
  applyUrl: string;
  slug: string;
  createdAt: Date | string;
  rawJob?: {
    id: string;
    sourceUrl: string;
    rawTitle: string;
    rawHtml?: string | null;
    sourceCategoryTags: string[];
    sourceId: string;
    scrapedAt: Date | string;
  } | null;
}

export function QueueTable({ initialJobs }: { initialJobs: any[] }) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [activeTabMap, setActiveTabMap] = useState<Record<string, "clean" | "raw">>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter & Search state
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Bulk Selection & Feedback state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);

  // Compute filtered jobs
  const filteredJobs = jobs.filter((job) => {
    const rawSource = job.sourceAttribution || job.rawJob?.sourceId || "source_yohire";
    const cleanSource = rawSource.replace("source_", "").toUpperCase();

    if (sourceFilter !== "ALL" && cleanSource !== sourceFilter) {
      return false;
    }
    if (confidenceFilter === "needs_review" && job.categoryConfidence === "high") {
      return false;
    }
    if (confidenceFilter === "high" && job.categoryConfidence !== "high") {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCompany = job.company.toLowerCase().includes(q);
      const matchRole = job.role.toLowerCase().includes(q);
      const matchCity = job.city.some((c) => c.toLowerCase().includes(q));
      if (!matchCompany && !matchRole && !matchCity) return false;
    }
    return true;
  });

  // Extract unique sources for filter pills
  const availableSources = Array.from(
    new Set(
      jobs.map((j) => (j.sourceAttribution || j.rawJob?.sourceId || "source_yohire").replace("source_", "").toUpperCase())
    )
  ).sort();

  // Selection helpers
  const allFilteredSelected = filteredJobs.length > 0 && filteredJobs.every((j) => selectedJobIds.has(j.id));
  const someFilteredSelected = filteredJobs.some((j) => selectedJobIds.has(j.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        filteredJobs.forEach((j) => next.delete(j.id));
        return next;
      });
    } else {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        filteredJobs.forEach((j) => next.add(j.id));
        return next;
      });
    }
  };

  const toggleSelectJob = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle row expansion
  const toggleExpand = (id: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (["input", "textarea"].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      const currentJob = filteredJobs[selectedIndex];

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredJobs.length - 1)));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "o") {
        if (currentJob) {
          e.preventDefault();
          toggleExpand(currentJob.id);
        }
      } else if (e.key.toLowerCase() === "x" && currentJob) {
        e.preventDefault();
        setSelectedJobIds((prev) => {
          const next = new Set(prev);
          if (next.has(currentJob.id)) next.delete(currentJob.id);
          else next.add(currentJob.id);
          return next;
        });
      } else if (e.key.toLowerCase() === "a" && currentJob) {
        e.preventDefault();
        handleAction(currentJob.id, "approve");
      } else if (e.key.toLowerCase() === "r" && currentJob) {
        e.preventDefault();
        handleAction(currentJob.id, "reject");
      } else if (e.key.toLowerCase() === "e" && currentJob) {
        e.preventDefault();
        window.open(`/admin/jobs/${currentJob.id}`, "_blank");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredJobs, selectedIndex]);

  // Single job action
  async function handleAction(id: string, action: "approve" | "reject") {
    setProcessingId(id);

    // Optimistic removal
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      const res = await fetch(`/api/admin/jobs/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        throw new Error("Action failed");
      }
    } catch (err) {
      console.error(`Error performing ${action} on job ${id}:`, err);
    } finally {
      setProcessingId(null);
    }
  }

  // Bulk Approve Selected
  async function handleBulkApproveSelected() {
    const ids = Array.from(selectedJobIds);
    if (ids.length === 0) return;

    setBulkProcessing(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/admin/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", jobIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.filter((j) => !selectedJobIds.has(j.id)));
        setSelectedJobIds(new Set());
        setBannerMessage(`⚡ Published ${data.count} jobs live! + ${data.socialPosts || 0} social posts queued`);
        setTimeout(() => setBannerMessage(null), 5000);
      } else {
        alert(data.error || "Bulk approve failed");
      }
    } catch (err) {
      console.error("Bulk approve error:", err);
      alert("Failed to execute bulk approve.");
    } finally {
      setBulkProcessing(false);
    }
  }

  // Bulk Reject Selected
  async function handleBulkRejectSelected() {
    const ids = Array.from(selectedJobIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to reject ${ids.length} selected job(s)?`)) return;

    setBulkProcessing(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/admin/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", jobIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.filter((j) => !selectedJobIds.has(j.id)));
        setSelectedJobIds(new Set());
        setBannerMessage(`Rejected ${data.count} jobs.`);
        setTimeout(() => setBannerMessage(null), 5000);
      } else {
        alert(data.error || "Bulk reject failed");
      }
    } catch (err) {
      console.error("Bulk reject error:", err);
      alert("Failed to execute bulk reject.");
    } finally {
      setBulkProcessing(false);
    }
  }

  // Bulk Approve High Confidence (1-Click)
  async function handleBulkApproveHighConfidence() {
    const highConfCount = jobs.filter((j) => j.categoryConfidence === "high").length;
    if (highConfCount === 0) {
      alert("No high-confidence draft jobs to approve.");
      return;
    }

    if (!confirm(`1-Click Approve all ${highConfCount} high-confidence jobs directly to public listings?`)) {
      return;
    }

    setBulkProcessing(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/admin/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", highConfidenceOnly: true }),
      });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.filter((j) => j.categoryConfidence !== "high"));
        setSelectedJobIds(new Set());
        setBannerMessage(`⚡ 1-Click Approved ${data.count} jobs to live site! + ${data.socialPosts || 0} social posts queued`);
        setTimeout(() => setBannerMessage(null), 6000);
      } else {
        alert(data.error || "Bulk approve failed");
      }
    } catch (err) {
      console.error("High confidence bulk approve error:", err);
      alert("Failed to execute bulk approve.");
    } finally {
      setBulkProcessing(false);
    }
  }

  // Optimize individual job with AI
  async function handleOptimizeJob(id: string) {
    setOptimizingId(id);
    try {
      const res = await fetch(`/api/admin/jobs/${id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.description) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  description: data.description,
                  categoryConfidence: "high",
                }
              : j
          )
        );
        setBannerMessage(`⚡ Job description optimized into 5 structured sections with AI! Confidence upgraded to High.`);
        setTimeout(() => setBannerMessage(null), 5000);
      } else {
        alert(data.error || "Failed to optimize description");
      }
    } catch (err) {
      console.error("Optimize job error:", err);
      alert("Failed to optimize job description.");
    } finally {
      setOptimizingId(null);
    }
  }

  const highConfidenceTotal = jobs.filter((j) => j.categoryConfidence === "high").length;
  const needsReviewTotal = jobs.filter((j) => j.categoryConfidence !== "high").length;

  if (jobs.length === 0) {
    return (
      <div className="p-16 text-center text-[#86888F]">
        <div className="w-12 h-12 rounded-full bg-[#252830] flex items-center justify-center mx-auto mb-3 text-[#3FA66B]">
          <Check size={24} />
        </div>
        <p className="text-lg font-semibold text-white">Review Queue is Clear!</p>
        <p className="text-sm mt-1">All scraped jobs have been reviewed and published or rejected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div className="p-3.5 bg-[#3FA66B]/15 border border-[#3FA66B]/30 rounded-lg text-xs font-semibold text-[#3FA66B] flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#3FA66B]" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-[#3FA66B] hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Filter & Search Controls Bar */}
      <div className="bg-[#141518] border border-[#2D3139] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86888F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search drafts by company, role, or city..."
              className="w-full bg-[#1A1B1F] border border-[#2D3139] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#86888F] focus:outline-none focus:border-[#3FA66B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86888F] hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick 1-Click High-Confidence Bulk Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApproveHighConfidence}
              disabled={bulkProcessing || highConfidenceTotal === 0}
              className="px-3 py-1.5 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Publish all high-confidence drafts directly without touching flagged items"
            >
              <Sparkles size={13} />
              <span>⚡ Bulk Approve High-Confidence ({highConfidenceTotal})</span>
            </button>
          </div>
        </div>

        {/* Source & Confidence Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#262830]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#86888F] mr-1 flex items-center gap-1">
              <Filter size={11} /> Source:
            </span>
            <button
              type="button"
              onClick={() => {
                setSourceFilter("ALL");
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                sourceFilter === "ALL"
                  ? "bg-[#2D3139] text-white font-semibold"
                  : "bg-[#18191E] text-[#86888F] hover:text-white"
              }`}
            >
              All ({jobs.length})
            </button>
            {availableSources.map((src) => {
              const count = jobs.filter(
                (j) => (j.sourceAttribution || j.rawJob?.sourceId || "source_yohire").replace("source_", "").toUpperCase() === src
              ).length;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setSourceFilter(src);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    sourceFilter === src
                      ? "bg-[#3FA66B] text-white font-semibold"
                      : "bg-[#18191E] text-[#86888F] hover:text-white"
                  }`}
                >
                  {src} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#86888F] mr-1">
              Confidence:
            </span>
            <button
              type="button"
              onClick={() => {
                setConfidenceFilter("ALL");
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                confidenceFilter === "ALL"
                  ? "bg-[#2D3139] text-white font-semibold"
                  : "bg-[#18191E] text-[#86888F] hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setConfidenceFilter("needs_review");
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                confidenceFilter === "needs_review"
                  ? "bg-[#D6553D] text-white font-semibold"
                  : "bg-[#18191E] text-[#D6553D] hover:bg-[#D6553D]/20"
              }`}
            >
              <AlertTriangle size={11} />
              Needs Review ({needsReviewTotal})
            </button>
            <button
              type="button"
              onClick={() => {
                setConfidenceFilter("high");
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                confidenceFilter === "high"
                  ? "bg-[#3FA66B] text-white font-semibold"
                  : "bg-[#18191E] text-[#3FA66B] hover:bg-[#3FA66B]/20"
              }`}
            >
              High ({highConfidenceTotal})
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Selection Action Toolbar (visible when 1+ selected) */}
      {selectedJobIds.size > 0 && (
        <div className="bg-[#1C2029] border border-[#3FA66B]/50 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-md">
          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2.5 py-1 rounded bg-[#3FA66B]/20 text-[#3FA66B] font-bold">
              {selectedJobIds.size} Job{selectedJobIds.size > 1 ? "s" : ""} Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedJobIds(new Set())}
              className="text-[#86888F] hover:text-white text-xs underline"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleBulkApproveSelected}
              disabled={bulkProcessing}
              className="px-4 py-1.5 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-bold rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {bulkProcessing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              <span>Approve Selected ({selectedJobIds.size})</span>
            </button>
            <button
              type="button"
              onClick={handleBulkRejectSelected}
              disabled={bulkProcessing}
              className="px-4 py-1.5 bg-[#2B2D33] hover:bg-[#3A3D46] text-[#EDEDEF] text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <X size={13} />
              <span>Reject Selected ({selectedJobIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-[#141518] border border-[#2D3139] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#2D3139] bg-[#101114] text-xs font-semibold uppercase tracking-wider text-[#86888F]">
                {/* Select All Checkbox */}
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someFilteredSelected && !allFilteredSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded bg-[#1F2128] border-[#2D3139] text-[#3FA66B] focus:ring-[#3FA66B] cursor-pointer"
                    title="Select All Displayed Jobs"
                  />
                </th>
                <th className="py-3.5 px-2 w-10"></th>
                <th className="py-3.5 px-4">Company & Role</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4">Degree</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3139]">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#86888F]">
                    No jobs match the current filter selection.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isExpanded = expandedJobIds.has(job.id);
                  const isChecked = selectedJobIds.has(job.id);
                  const isNeedsReview = job.categoryConfidence !== "high";
                  const currentTab = activeTabMap[job.id] || "clean";

                  const sourceName = job.sourceAttribution || job.rawJob?.sourceId || "source_yohire";
                  const cleanSourceLabel = sourceName.replace("source_", "").toUpperCase();

                  return (
                    <Fragment key={job.id}>
                      {/* Summary Row */}
                      <tr
                        onClick={() => setSelectedIndex(idx)}
                        className={`cursor-pointer transition-colors duration-75 ${
                          isChecked
                            ? "bg-[#1E2526] ring-1 ring-[#3FA66B]/60"
                            : isSelected
                            ? "bg-[#252830] ring-1 ring-[#3FA66B]/50"
                            : isNeedsReview
                            ? "bg-[#211718] hover:bg-[#2A1E20]"
                            : "hover:bg-[#1F2128]"
                        }`}
                      >
                        {/* Row Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleSelectJob(job.id, e)}
                            className="w-4 h-4 rounded bg-[#1F2128] border-[#2D3139] text-[#3FA66B] focus:ring-[#3FA66B] cursor-pointer"
                          />
                        </td>

                        {/* Expand / Collapse Toggle */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(job.id);
                            }}
                            className="p-1 rounded hover:bg-[#2F323B] text-[#86888F] hover:text-white transition-colors"
                            title={isExpanded ? "Collapse Details" : "Expand Full Details"}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>

                        {/* Company & Role */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white flex items-center space-x-2">
                            <span>{job.company}</span>
                            {job.applyUrl && (
                              <a
                                href={job.applyUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#86888F] hover:text-[#3FA66B] transition-colors"
                                title="Direct Apply Link"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-[#86888F] line-clamp-1">{job.role}</div>
                        </td>

                        {/* City */}
                        <td className="py-3 px-4 text-xs text-[#EDEDEF]">
                          {job.city && job.city.length > 0 ? job.city.join(", ") : "—"}
                        </td>

                        {/* Batch */}
                        <td className="py-3 px-4 text-xs font-mono tabular-nums text-[#EDEDEF]">
                          {job.batchYears && job.batchYears.length > 0 ? job.batchYears.join(", ") : "—"}
                        </td>

                        {/* Degree */}
                        <td className="py-3 px-4 text-xs text-[#86888F]">
                          {job.degree && job.degree.length > 0 ? job.degree.join(", ") : "—"}
                        </td>

                        {/* Source */}
                        <td className="py-3 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1F2128] text-[#86888F] border border-[#2D3139]">
                            {cleanSourceLabel}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="py-3 px-4">
                          {isNeedsReview ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#D6553D]/20 text-[#D6553D] border border-[#D6553D]/40">
                              <AlertTriangle size={11} />
                              Needs Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#3FA66B]/20 text-[#3FA66B]">
                              High
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(job.id);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-[#252830] text-[#EDEDEF] border border-[#353842] rounded hover:bg-[#30333D] transition-colors"
                          >
                            <span>{isExpanded ? "Hide" : "Details"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(job.id, "approve");
                            }}
                            disabled={processingId === job.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-[#3FA66B] text-white rounded hover:bg-[#348a58] transition-colors disabled:opacity-50"
                          >
                            <Check size={12} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(job.id, "reject");
                            }}
                            disabled={processingId === job.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-[#2B2D33] text-[#EDEDEF] rounded hover:bg-[#383A42] transition-colors disabled:opacity-50"
                          >
                            <X size={12} />
                            <span>Reject</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Full Details Panel */}
                      {isExpanded && (
                        <tr className="bg-[#121316] border-y-2 border-[#3FA66B]/40">
                          <td colSpan={9} className="p-6">
                            <div className="space-y-6">
                              {/* Header Bar with Badges & Action Buttons */}
                              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262830]">
                                <div>
                                  <div className="flex items-center space-x-3">
                                    <h3 className="text-lg font-bold text-white tracking-tight">
                                      {job.company} — {job.role}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      Draft
                                    </span>
                                    {isNeedsReview && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D6553D]/20 text-[#D6553D] border border-[#D6553D]/40">
                                        Operator Review Flagged
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#86888F] mt-1">
                                    Ingested from <strong className="text-[#EDEDEF]">{cleanSourceLabel}</strong> • Slug:{" "}
                                    <code className="text-xs font-mono text-[#3FA66B]">{job.slug}</code>
                                  </p>
                                </div>

                                <div className="flex items-center space-x-3">
                                  {/* AI Optimize Description Trigger */}
                                  <button
                                    type="button"
                                    onClick={() => handleOptimizeJob(job.id)}
                                    disabled={optimizingId === job.id}
                                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-700/50 rounded-md transition-colors disabled:opacity-50 shadow-sm"
                                    title="Restructure raw description into clean markdown sections"
                                  >
                                    {optimizingId === job.id ? (
                                      <Loader2 size={13} className="animate-spin text-purple-400" />
                                    ) : (
                                      <Sparkles size={13} className="text-purple-400" />
                                    )}
                                    <span>{optimizingId === job.id ? "Optimizing..." : "⚡ AI Optimize Description"}</span>
                                  </button>

                                  <Link
                                    href={`/admin/jobs/${job.id}`}
                                    target="_blank"
                                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-[#202228] text-[#EDEDEF] border border-[#353842] rounded-md hover:bg-[#2B2D34] transition-colors"
                                  >
                                    <Edit3 size={13} />
                                    <span>Edit in Studio</span>
                                  </Link>
                                  <Link
                                    href={`/jobs/${job.slug}`}
                                    target="_blank"
                                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-[#202228] text-[#EDEDEF] border border-[#353842] rounded-md hover:bg-[#2B2D34] transition-colors"
                                  >
                                    <Eye size={13} />
                                    <span>Public Preview</span>
                                  </Link>
                                </div>
                              </div>

                              {/* Quick Link Cards Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Direct Apply Link */}
                                <div className="p-3.5 bg-[#18191E] border border-[#2B2E37] rounded-lg">
                                  <div className="flex items-center justify-between text-xs text-[#86888F] mb-1.5">
                                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#3FA66B]">
                                      <Sparkles size={13} /> Direct Application Link
                                    </span>
                                    <span className="text-[11px]">Official Careers / ATS</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono text-[#EDEDEF] truncate select-all">
                                      {job.applyUrl || "No apply URL detected"}
                                    </span>
                                    {job.applyUrl && (
                                      <a
                                        href={job.applyUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 px-2.5 py-1 bg-[#252830] hover:bg-[#3FA66B] text-[#EDEDEF] hover:text-white rounded text-xs transition-colors flex items-center gap-1"
                                      >
                                        <span>Open Link</span>
                                        <ExternalLink size={11} />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Scraped Source Post URL */}
                                <div className="p-3.5 bg-[#18191E] border border-[#2B2E37] rounded-lg">
                                  <div className="flex items-center justify-between text-xs text-[#86888F] mb-1.5">
                                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#86888F]">
                                      <Globe size={13} /> Scraped Source Post
                                    </span>
                                    <span className="text-[11px]">Origin Article</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono text-[#86888F] truncate select-all">
                                      {job.rawJob?.sourceUrl || "No source URL recorded"}
                                    </span>
                                    {job.rawJob?.sourceUrl && (
                                      <a
                                        href={job.rawJob.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 px-2.5 py-1 bg-[#252830] hover:bg-[#30333D] text-[#86888F] hover:text-white rounded text-xs transition-colors flex items-center gap-1"
                                      >
                                        <span>View Scraped</span>
                                        <ExternalLink size={11} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Structured Metadata Badges Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                <div className="p-2.5 bg-[#18191E] border border-[#272932] rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-[#86888F] font-bold flex items-center gap-1">
                                    <MapPin size={11} /> City
                                  </div>
                                  <div className="text-xs font-semibold text-white mt-1">
                                    {job.city?.length > 0 ? job.city.join(", ") : "Pan India / Unspecified"}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-[#18191E] border border-[#272932] rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-[#86888F] font-bold flex items-center gap-1">
                                    <Calendar size={11} /> Batch Years
                                  </div>
                                  <div className="text-xs font-semibold text-white mt-1 font-mono tabular-nums">
                                    {job.batchYears?.length > 0 ? job.batchYears.join(", ") : "Any Batch"}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-[#18191E] border border-[#272932] rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-[#86888F] font-bold flex items-center gap-1">
                                    <GraduationCap size={11} /> Degree
                                  </div>
                                  <div className="text-xs font-semibold text-white mt-1">
                                    {job.degree?.length > 0 ? job.degree.join(", ") : "Any Degree"}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-[#18191E] border border-[#272932] rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-[#86888F] font-bold flex items-center gap-1">
                                    <Briefcase size={11} /> Job Type
                                  </div>
                                  <div className="text-xs font-semibold text-white mt-1 capitalize">
                                    {job.jobType || "fresher"}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-[#18191E] border border-[#272932] rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-[#86888F] font-bold flex items-center gap-1">
                                    <Clock size={11} /> Deadline
                                  </div>
                                  <div className="text-xs font-semibold text-white mt-1 tabular-nums">
                                    {job.deadline ? new Date(job.deadline).toLocaleDateString() : "Ongoing (+30d default)"}
                                  </div>
                                </div>

                                <div className="p-2.5 bg-[#18191E] border border-[#272932] rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-[#86888F] font-bold flex items-center gap-1">
                                    <DollarSign size={11} /> Salary
                                  </div>
                                  <div className="text-xs font-semibold text-white mt-1">
                                    {job.salaryText || "Standard Fresher CTC"}
                                  </div>
                                </div>
                              </div>

                              {/* Tabbed Description Inspection: Clean Rewrite vs Raw Scraped HTML */}
                              <div className="bg-[#18191E] border border-[#272932] rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#272932] bg-[#141518]">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => setActiveTabMap((p) => ({ ...p, [job.id]: "clean" }))}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                        currentTab === "clean"
                                          ? "bg-[#3FA66B] text-white"
                                          : "text-[#86888F] hover:text-white"
                                      }`}
                                    >
                                      Structured Description (Markdown)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveTabMap((p) => ({ ...p, [job.id]: "raw" }))}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                        currentTab === "raw"
                                          ? "bg-[#2A2D37] text-white"
                                          : "text-[#86888F] hover:text-white"
                                      }`}
                                    >
                                      Raw Scraped HTML / Text (Audit)
                                    </button>
                                  </div>
                                  <span className="text-[11px] text-[#86888F]">
                                    {currentTab === "clean"
                                      ? "Rewritten content shown on public job detail page"
                                      : "Original body text scraped from source site"}
                                  </span>
                                </div>

                                <div className="p-4 max-h-[360px] overflow-y-auto">
                                  {currentTab === "clean" ? (
                                    <div className="text-xs text-[#EDEDEF] whitespace-pre-line font-sans leading-relaxed">
                                      {job.description || "No description generated."}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-[#86888F] font-mono whitespace-pre-wrap leading-relaxed select-all">
                                      {job.descriptionRaw || job.rawJob?.rawHtml || "No raw text available."}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Raw Category Tags Pill List */}
                              {job.rawJob?.sourceCategoryTags && job.rawJob.sourceCategoryTags.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#86888F] flex items-center gap-1">
                                    <Tag size={11} /> Raw Ingested Source Category Tags:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {job.rawJob.sourceCategoryTags.map((tag: string, tIdx: number) => (
                                      <span
                                        key={tIdx}
                                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1E2026] text-[#86888F] border border-[#2D3139]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Persistent Keyboard Shortcuts Hint Bar (Section 9 & Section 12) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#121316]/95 backdrop-blur border-t border-[#2D3139] px-6 py-2.5 text-xs text-[#86888F] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-white">Shortcuts:</span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#EDEDEF] text-[10px] font-mono">j</kbd> /{" "}
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#EDEDEF] text-[10px] font-mono">k</kbd> navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#EDEDEF] text-[10px] font-mono">x</kbd> select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#EDEDEF] text-[10px] font-mono">o</kbd> expand details
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#3FA66B] text-[10px] font-mono">a</kbd> approve
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#D6553D] text-[10px] font-mono">r</kbd> reject
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#202228] border border-[#353842] rounded text-[#EDEDEF] text-[10px] font-mono">e</kbd> edit
          </span>
        </div>

        <div className="text-[11px] text-[#86888F]">
          Showing <strong className="text-white">{filteredJobs.length}</strong> of <strong className="text-white">{jobs.length}</strong> drafts
        </div>
      </div>
    </div>
  );
}
