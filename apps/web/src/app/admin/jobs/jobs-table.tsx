"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Edit,
  RotateCcw,
  Ban,
  Trash2,
  Clock,
  Eye,
  MousePointer,
  Search,
} from "lucide-react";

interface JobRecord {
  id: string;
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  jobType: string;
  status: string;
  deadline: Date | string | null;
  slug: string;
  viewCount: number;
  applyClickCount: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

export function JobsTable({ initialJobs }: { initialJobs: JobRecord[] }) {
  const [jobs, setJobs] = useState<JobRecord[]>(initialJobs);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = jobs.filter((j) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        j.city.some((c) => c.toLowerCase().includes(q))
      );
    }
    return true;
  });

  async function updateStatus(id: string, newStatus: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "published" ? { publishedAt: new Date() } : {}),
          ...(newStatus === "expired" ? { expiredAt: new Date() } : {}),
        }),
      });

      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j))
        );
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteJob(id: string) {
    if (!confirm("Are you sure you want to permanently delete this job?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    } catch (err) {
      console.error("Error deleting job:", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1B1F] p-4 rounded-xl border border-[#2D3139]">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["all", "published", "draft", "expired", "rejected"].map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors capitalize ${
                  active
                    ? "bg-[#2A2D37] text-white border border-[#3E4352]"
                    : "text-[#86888F] hover:text-white hover:bg-[#20222A]"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86888F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, role, city..."
            className="w-full bg-[#121316] border border-[#2D3139] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-[#86888F] focus:outline-none focus:border-[#3FA66B]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2D3139] bg-[#141518] text-[11px] font-bold uppercase tracking-wider text-[#86888F]">
                <th className="py-3 px-4">Role & Company</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Stats</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262830]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86888F]">
                    No jobs match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((job) => {
                  let daysLeft: number | null = null;
                  if (job.deadline) {
                    const diffMs = new Date(job.deadline).getTime() - Date.now();
                    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <tr key={job.id} className="hover:bg-[#20222A] transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="font-bold text-white hover:text-[#E8873A] transition-colors block text-sm"
                        >
                          {job.role}
                        </Link>
                        <span className="text-[#86888F] text-xs">{job.company}</span>
                      </td>

                      <td className="py-3 px-4 text-[#EDEDEF]">
                        {job.city.length > 0 ? job.city.join(", ") : "—"}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums text-[#EDEDEF]">
                        {job.batchYears.length > 0 ? job.batchYears.join(", ") : "—"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            job.status === "published"
                              ? "bg-[#3FA66B]/20 text-[#3FA66B] border border-[#3FA66B]/40"
                              : job.status === "draft"
                              ? "bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40"
                              : job.status === "expired"
                              ? "bg-[#5B5D66]/20 text-[#86888F] border border-[#5B5D66]/40"
                              : "bg-[#D6553D]/20 text-[#D6553D] border border-[#D6553D]/40"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#86888F] font-mono tabular-nums">
                        {daysLeft !== null ? (
                          <span
                            className={
                              daysLeft <= 3 && daysLeft >= 0 ? "text-[#E8873A] font-bold" : ""
                            }
                          >
                            {daysLeft < 0
                              ? "Expired"
                              : daysLeft === 0
                              ? "Closes Today"
                              : `${daysLeft}d remaining`}
                          </span>
                        ) : (
                          "Open"
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3 text-[11px] text-[#86888F]">
                          <span className="flex items-center gap-1">
                            <Eye size={11} /> {job.viewCount}
                          </span>
                          <span className="flex items-center gap-1 text-[#3FA66B]">
                            <MousePointer size={11} /> {job.applyClickCount}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2 shrink-0">
                        {job.status === "published" ? (
                          <button
                            onClick={() => updateStatus(job.id, "expired")}
                            disabled={actionLoading === job.id}
                            title="Force Expire Job"
                            className="p-1.5 bg-[#252830] hover:bg-[#D6553D]/30 text-[#86888F] hover:text-[#D6553D] rounded border border-[#343844] transition-colors"
                          >
                            <Ban size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatus(job.id, "published")}
                            disabled={actionLoading === job.id}
                            title="Publish / Re-publish Job"
                            className="p-1.5 bg-[#252830] hover:bg-[#3FA66B]/30 text-[#86888F] hover:text-[#3FA66B] rounded border border-[#343844] transition-colors"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}

                        <Link
                          href={`/admin/jobs/${job.id}`}
                          title="Full Edit Form"
                          className="p-1.5 inline-block bg-[#252830] hover:bg-[#3FA66B] text-[#EDEDEF] rounded border border-[#343844] transition-colors"
                        >
                          <Edit size={13} />
                        </Link>

                        {job.status === "published" && (
                          <Link
                            href={`/jobs/${job.slug}`}
                            target="_blank"
                            title="View Public Page"
                            className="p-1.5 inline-block bg-[#252830] hover:bg-[#30333E] text-[#86888F] hover:text-white rounded border border-[#343844] transition-colors"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        )}

                        <button
                          onClick={() => deleteJob(job.id)}
                          disabled={actionLoading === job.id}
                          title="Delete Permanently"
                          className="p-1.5 bg-[#252830] hover:bg-[#D6553D]/40 text-[#86888F] hover:text-[#D6553D] rounded border border-[#343844] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
