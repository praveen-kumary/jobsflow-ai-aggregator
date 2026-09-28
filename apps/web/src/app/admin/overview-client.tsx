"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Inbox,
  CheckCircle2,
  Clock,
  Eye,
  MousePointerClick,
  RotateCw,
  ChevronRight,
  Play,
  Database,
  Layers,
} from "lucide-react";

interface OverviewProps {
  stats: {
    pendingDrafts: number;
    needsReviewCount: number;
    publishedTotal: number;
    publishedToday: number;
    expiringSoonCount: number;
    expiredTotal: number;
    totalViews: number;
    totalApplies: number;
    activeSources: number;
  };
  expiringSoonJobs: any[];
  recentRuns: any[];
}

export function OverviewClient({
  stats,
  expiringSoonJobs,
  recentRuns,
}: OverviewProps) {
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [systemMsg, setSystemMsg] = useState<string | null>(null);

  async function triggerSystemAction(action: string) {
    setRunningAction(action);
    setSystemMsg(null);
    try {
      const res = await fetch("/api/admin/system/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setSystemMsg(data.message);
      } else {
        setSystemMsg(data.error || "Action failed");
      }
    } catch (err: any) {
      setSystemMsg(err.message);
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Pipeline health, review metrics, and expiry controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSystemAction("run_expiry")}
            disabled={runningAction !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1E2028] hover:bg-[#252830] border border-[#2D3139] text-xs font-medium text-[#EDEDEF] transition-colors disabled:opacity-50"
          >
            <RotateCw
              size={12}
              className={runningAction === "run_expiry" ? "animate-spin" : ""}
            />
            <span>Run Expiry</span>
          </button>
          <Link
            href="/admin/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#3FA66B] hover:bg-[#348a58] text-xs font-bold text-white transition-colors"
          >
            <Inbox size={12} />
            <span>Review Queue</span>
          </Link>
        </div>
      </div>

      {systemMsg && (
        <div className="p-2.5 bg-[#1A2E20] border border-[#3FA66B]/40 rounded-md text-xs text-[#3FA66B] flex items-center justify-between">
          <span>{systemMsg}</span>
          <button
            onClick={() => setSystemMsg(null)}
            className="text-[#6B6D75] hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Review Queue */}
        <Link
          href="/admin/queue"
          className="bg-[#1A1B1F] border border-[#2D3139] hover:border-[#3E4352] rounded-lg p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6D75]">
              Review Queue
            </span>
            <Inbox
              size={14}
              className="text-[#6B6D75] group-hover:text-[#3FA66B] transition-colors"
            />
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.pendingDrafts}
          </span>
          {stats.needsReviewCount > 0 && (
            <span className="ml-2 text-[10px] font-semibold text-[#D6553D] bg-[#D6553D]/10 px-1.5 py-0.5 rounded border border-[#D6553D]/20">
              {stats.needsReviewCount} flagged
            </span>
          )}
          <p className="text-[11px] text-[#6B6D75] mt-1.5">
            Drafts awaiting publication
          </p>
        </Link>

        {/* Published */}
        <Link
          href="/admin/jobs?status=published"
          className="bg-[#1A1B1F] border border-[#2D3139] hover:border-[#3E4352] rounded-lg p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6D75]">
              Live Published
            </span>
            <CheckCircle2 size={14} className="text-[#3FA66B]" />
          </div>
          <span className="text-2xl font-bold text-[#3FA66B] tabular-nums">
            {stats.publishedTotal}
          </span>
          <span className="ml-2 text-[11px] text-[#6B6D75] tabular-nums">
            +{stats.publishedToday} today
          </span>
          <p className="text-[11px] text-[#6B6D75] mt-1.5">
            Active on public index
          </p>
        </Link>

        {/* Expiring */}
        <Link
          href="/admin/jobs?status=published"
          className="bg-[#1A1B1F] border border-[#2D3139] hover:border-[#3E4352] rounded-lg p-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6D75]">
              Expiring ≤3d
            </span>
            <Clock size={14} className="text-[#E8873A]" />
          </div>
          <span className="text-2xl font-bold text-[#E8873A] tabular-nums">
            {stats.expiringSoonCount}
          </span>
          <span className="ml-2 text-[11px] text-[#6B6D75] tabular-nums">
            {stats.expiredTotal} expired
          </span>
          <p className="text-[11px] text-[#6B6D75] mt-1.5">
            Auto-closes on deadline
          </p>
        </Link>

        {/* Engagement */}
        <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6D75]">
              Engagement
            </span>
            <MousePointerClick size={14} className="text-[#6B6D75]" />
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-[10px] text-[#6B6D75] block">Views</span>
              <span className="text-lg font-bold text-white tabular-nums">
                {stats.totalViews}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#6B6D75] block">Clicks</span>
              <span className="text-lg font-bold text-[#3FA66B] tabular-nums">
                {stats.totalApplies}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#6B6D75] mt-1.5">
            {stats.totalViews > 0
              ? `${((stats.totalApplies / stats.totalViews) * 100).toFixed(1)}% CTR`
              : "Awaiting traffic"}
          </p>
        </div>
      </div>

      {/* Quick links strip */}
      <div className="flex flex-wrap items-center gap-2 py-2">
        <Link
          href="/admin/queue"
          className="px-3 py-1.5 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
        >
          <Inbox size={12} />
          Review Queue ({stats.pendingDrafts})
        </Link>
        <Link
          href="/admin/sources"
          className="px-3 py-1.5 bg-[#1E2028] hover:bg-[#252830] border border-[#2D3139] text-[#EDEDEF] text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
        >
          <Database size={12} className="text-[#6B6D75]" />
          Ingest Backlog
        </Link>
        <Link
          href="/admin/duplicates"
          className="px-3 py-1.5 bg-[#1E2028] hover:bg-[#252830] border border-[#2D3139] text-[#EDEDEF] text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
        >
          <Layers size={12} className="text-[#6B6D75]" />
          Audit Duplicates
        </Link>
      </div>

      {/* Two Columns: Deadlines + Scrape Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Upcoming Deadlines */}
        <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D3139]">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#E8873A]" />
              <h2 className="font-semibold text-sm text-white">
                Deadlines — Next 7d
              </h2>
            </div>
            <Link
              href="/admin/jobs"
              className="text-[11px] text-[#6B6D75] hover:text-white flex items-center gap-0.5"
            >
              All jobs <ChevronRight size={11} />
            </Link>
          </div>

          {expiringSoonJobs.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6B6D75]">
              No jobs expiring within 7 days
            </div>
          ) : (
            <div className="divide-y divide-[#222430]">
              {expiringSoonJobs.map((j) => {
                const diffMs = j.deadline
                  ? new Date(j.deadline).getTime() - Date.now()
                  : 0;
                const daysLeft = Math.max(
                  0,
                  Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                );
                return (
                  <div
                    key={j.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#1E2028] transition-colors"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/jobs/${j.id}`}
                        className="font-medium text-xs text-white hover:text-[#E8873A] truncate block"
                      >
                        {j.company} — {j.role}
                      </Link>
                      <span className="text-[11px] text-[#6B6D75]">
                        {j.city.join(", ")} • {j.batchYears.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums bg-[#E8873A]/10 text-[#E8873A] border border-[#E8873A]/20">
                        {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                      </span>
                      <Link
                        href={`/admin/jobs/${j.id}`}
                        className="px-2 py-0.5 bg-[#1E2028] hover:bg-[#252830] text-[11px] text-[#EDEDEF] rounded border border-[#2D3139]"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Scrape Runs */}
        <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D3139]">
            <div className="flex items-center gap-2">
              <Play size={14} className="text-[#3FA66B]" />
              <h2 className="font-semibold text-sm text-white">
                Recent Scraper Runs
              </h2>
            </div>
            <Link
              href="/admin/sources"
              className="text-[11px] text-[#6B6D75] hover:text-white flex items-center gap-0.5"
            >
              Sources <ChevronRight size={11} />
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6B6D75]">
              No scraper runs recorded yet
            </div>
          ) : (
            <div className="divide-y divide-[#222430]">
              {recentRuns.map((r) => (
                <div
                  key={r.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#1E2028] transition-colors text-xs"
                >
                  <div>
                    <div className="font-medium text-white">
                      {r.source?.name || r.sourceId}
                    </div>
                    <div className="text-[11px] text-[#6B6D75]">
                      {new Date(r.startedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-white font-semibold tabular-nums">
                        +{r.jobsNew}
                      </span>
                      <span className="text-[#6B6D75] text-[10px] block">
                        of {r.jobsFound}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        r.status === "success"
                          ? "bg-[#3FA66B]/15 text-[#3FA66B]"
                          : r.status === "failed"
                          ? "bg-[#D6553D]/15 text-[#D6553D]"
                          : "bg-[#C9A227]/15 text-[#C9A227]"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
