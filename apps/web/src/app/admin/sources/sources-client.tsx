"use client";

import { useState } from "react";
import {
  Globe,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  Save,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  RefreshCw,
} from "lucide-react";

interface SourceItem {
  id: string;
  name: string;
  baseUrl: string;
  feedUrl: string | null;
  scrapeConfig: any;
  isActive: boolean;
  lastScrapedAt: Date | string | null;
  rawJobsCount: number;
  scrapeRuns: any[];
}

export interface BacklogStats {
  rawJobsTotal: number;
  rawJobsPending: number;
  rawJobsProcessed: number;
  canonicalJobsTotal: number;
}

export function SourcesClient({
  initialSources,
  backlogStats,
}: {
  initialSources: SourceItem[];
  backlogStats?: BacklogStats;
}) {
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [backlog, setBacklog] = useState<BacklogStats | undefined>(backlogStats);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState<{ [id: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function toggleExpand(id: string, currentConfig: any) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!configJson[id]) {
        setConfigJson((prev) => ({
          ...prev,
          [id]: JSON.stringify(currentConfig, null, 2),
        }));
      }
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: !currentActive } : s))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function saveConfig(id: string) {
    setActionLoading(id);
    setStatusMsg(null);
    try {
      const parsed = JSON.parse(configJson[id]);
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapeConfig: parsed }),
      });
      if (res.ok) {
        setStatusMsg("Scrape configuration saved successfully!");
      }
    } catch (err: any) {
      setStatusMsg("Invalid JSON: " + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function runScrapeNow(id: string) {
    setActionLoading(id);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/sources/${id}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message);
        // Refresh sources state
        if (data.stats) {
          setSources((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    rawJobsCount: s.rawJobsCount + (data.stats.newRawJobsInserted || 0),
                    lastScrapedAt: new Date().toISOString(),
                  }
                : s
            )
          );
        }
      } else {
        setStatusMsg("Scrape failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setStatusMsg("Error running scrape: " + err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleProcessBacklog(batchSize: number) {
    setBacklogLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin/sources/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message);
        if (backlog) {
          const count = data.result?.processedCount || 0;
          const created = data.result?.newJobsCreated || 0;
          setBacklog({
            ...backlog,
            rawJobsPending: Math.max(0, backlog.rawJobsPending - count),
            rawJobsProcessed: backlog.rawJobsProcessed + count,
            canonicalJobsTotal: backlog.canonicalJobsTotal + created,
          });
        }
      } else {
        setStatusMsg("Error processing backlog: " + data.error);
      }
    } catch (err: any) {
      setStatusMsg("Error processing backlog: " + err.message);
    } finally {
      setBacklogLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="p-3.5 bg-[#1F241E] border border-[#3FA66B]/60 rounded-lg text-xs text-[#3FA66B] font-medium flex items-center justify-between shadow-md">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-[#86888F] hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* Real Ingestion Backlog Control Card */}
      {backlog && (
        <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-5 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#252830] border border-[#343844] flex items-center justify-center text-[#3FA66B]">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Raw Postings Staging Backlog</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3FA66B]/20 text-[#3FA66B] border border-[#3FA66B]/30">
                    Live Pipeline
                  </span>
                </h3>
                <p className="text-xs text-[#86888F] mt-0.5">
                  Raw URLs are staged in PostgreSQL. Trigger enrichment & deduplication into canonical Review Queue drafts on demand.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center space-x-6 text-xs">
              <div>
                <span className="text-[11px] text-[#86888F] block">Total Scraped</span>
                <span className="text-base font-bold text-white">{backlog.rawJobsTotal}</span>
              </div>
              <div>
                <span className="text-[11px] text-amber-400 block">Pending Ingestion</span>
                <span className="text-base font-bold text-amber-400">{backlog.rawJobsPending}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#3FA66B] block">Processed Drafts</span>
                <span className="text-base font-bold text-[#3FA66B]">{backlog.canonicalJobsTotal}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => handleProcessBacklog(10)}
                disabled={backlogLoading || backlog.rawJobsPending === 0}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-[#252830] hover:bg-[#30333E] text-[#EDEDEF] border border-[#3A3E4A] rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap size={13} className="text-amber-400" />
                <span>{backlogLoading ? "Ingesting..." : "Ingest Next 10"}</span>
              </button>

              <button
                onClick={() => handleProcessBacklog(25)}
                disabled={backlogLoading || backlog.rawJobsPending === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-[#3FA66B] hover:bg-[#348a58] text-white rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                <RefreshCw size={13} className={backlogLoading ? "animate-spin" : ""} />
                <span>{backlogLoading ? "Processing..." : "Ingest Next 25"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sources Grid */}
      <div className="grid grid-cols-1 gap-6">
        {sources.map((source) => {
          const isExpanded = expandedId === source.id;

          return (
            <div
              key={source.id}
              className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl overflow-hidden shadow-lg"
            >
              {/* Header card */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262830]">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#252830] border border-[#343844] flex items-center justify-center text-[#EDEDEF]">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-white">{source.name}</h2>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          source.isActive
                            ? "bg-[#3FA66B]/20 text-[#3FA66B] border border-[#3FA66B]/30"
                            : "bg-[#86888F]/20 text-[#86888F] border border-[#86888F]/30"
                        }`}
                      >
                        {source.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <a
                      href={source.baseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#86888F] hover:text-[#3FA66B] transition-colors mt-0.5 inline-block"
                    >
                      {source.baseUrl}
                    </a>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-4 self-end sm:self-auto">
                  <div className="text-right text-xs">
                    <span className="text-[#86888F] block text-[11px]">Total Scraped</span>
                    <span className="font-bold text-white text-sm">
                      {source.rawJobsCount} <span className="text-xs text-[#86888F]">Raw Jobs</span>
                    </span>
                  </div>

                  <div className="text-right text-xs border-l border-[#2D3139] pl-4">
                    <span className="text-[#86888F] block text-[11px]">Last Scrape</span>
                    <span className="font-medium text-[#EDEDEF]">
                      {source.lastScrapedAt
                        ? new Date(source.lastScrapedAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pl-2">
                    <button
                      onClick={() => runScrapeNow(source.id)}
                      disabled={actionLoading === source.id || !source.isActive}
                      className="px-3 py-1.5 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 disabled:opacity-50"
                    >
                      <Play size={12} />
                      <span>{actionLoading === source.id ? "Scraping..." : "Run Scrape"}</span>
                    </button>

                    <button
                      onClick={() => toggleActive(source.id, source.isActive)}
                      disabled={actionLoading === source.id}
                      className="px-3 py-1.5 bg-[#252830] hover:bg-[#2C303A] text-xs text-[#EDEDEF] rounded-md transition-colors border border-[#353844] disabled:opacity-50"
                    >
                      {source.isActive ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => toggleExpand(source.id, source.scrapeConfig)}
                      className="p-1.5 text-[#86888F] hover:text-white rounded-md hover:bg-[#252830] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Details: JSON Config Editor & Execution History */}
              {isExpanded && (
                <div className="p-6 bg-[#141518] space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* JSON Config Editor */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#86888F] flex items-center gap-1.5">
                          <Settings2 size={13} />
                          Scrape Config (Selectors & Rate Limits)
                        </span>
                        <button
                          onClick={() => saveConfig(source.id)}
                          disabled={actionLoading === source.id}
                          className="px-3 py-1 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
                        >
                          <Save size={11} />
                          <span>Save Config</span>
                        </button>
                      </div>
                      <textarea
                        rows={9}
                        value={configJson[source.id] || ""}
                        onChange={(e) =>
                          setConfigJson((prev) => ({
                            ...prev,
                            [source.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-[#1A1B1F] border border-[#2D3139] rounded-lg p-3 text-xs font-mono text-[#EDEDEF] focus:outline-none focus:border-[#3FA66B]"
                      />
                    </div>

                    {/* ScrapeRun History */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#86888F] flex items-center gap-1.5">
                        <Clock size={13} />
                        Recent Scrape Runs
                      </span>
                      <div className="border border-[#2D3139] rounded-lg overflow-hidden bg-[#1A1B1F]">
                        {source.scrapeRuns.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#86888F]">
                            No runs recorded for this source.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#2D3139] bg-[#16171D] text-[10px] uppercase text-[#86888F]">
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3">Status</th>
                                <th className="py-2 px-3 text-right">Found / New</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#262830]">
                              {source.scrapeRuns.slice(0, 5).map((run) => (
                                <tr key={run.id} className="hover:bg-[#20222A]">
                                  <td className="py-2 px-3 text-[#EDEDEF]">
                                    {new Date(run.startedAt).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        run.status === "success"
                                          ? "text-[#3FA66B]"
                                          : "text-[#D6553D]"
                                      }`}
                                    >
                                      {run.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white">
                                    {run.jobsFound} / +{run.jobsNew}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
