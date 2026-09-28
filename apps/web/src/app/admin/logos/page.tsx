"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
} from "lucide-react";

interface CompanyLogoRow {
  id: string;
  companyNormalized: string;
  logoUrl: string;
  resolvedDomain: string | null;
  source: string;
  isVerified: boolean;
  updatedAt: string;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  source_scraped: { label: "Scraped", color: "text-blue-400" },
  logo_dev: { label: "logo.dev", color: "text-purple-400" },
  google_favicon: { label: "Favicon", color: "text-yellow-400" },
  generated_monogram: { label: "Monogram", color: "text-gray-400" },
  manual: { label: "Manual", color: "text-green-400" },
};

export default function AdminLogosPage() {
  const [logos, setLogos] = useState<CompanyLogoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sourceFilter) params.set("source", sourceFilter);
    if (verifiedFilter) params.set("verified", verifiedFilter);

    const res = await fetch(`/api/admin/logos?${params}`);
    const data = await res.json();
    setLogos(data);
    setLoading(false);
  }, [search, sourceFilter, verifiedFilter]);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  const toggleVerified = async (logo: CompanyLogoRow) => {
    await fetch(`/api/admin/logos/${logo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !logo.isVerified }),
    });
    fetchLogos();
  };

  const deleteLogo = async (id: string) => {
    if (!confirm("Delete this logo? It will be re-resolved on next access.")) return;
    await fetch(`/api/admin/logos/${id}`, { method: "DELETE" });
    fetchLogos();
  };

  const stats = {
    total: logos.length,
    verified: logos.filter((l) => l.isVerified).length,
    monogram: logos.filter((l) => l.source === "generated_monogram").length,
    favicon: logos.filter((l) => l.source === "google_favicon").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#EDEDEF]">Company Logos</h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Manage resolved logos. Verify correct ones, fix wrong ones.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-[#EDEDEF]" },
          { label: "Verified", value: stats.verified, color: "text-green-400" },
          { label: "Monograms", value: stats.monogram, color: "text-gray-400" },
          { label: "Favicons", value: stats.favicon, color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#1A1C23] border border-[#2A2D37] rounded-lg p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[#6B6D75] uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6D75]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company..."
            className="w-full bg-[#1A1C23] border border-[#2A2D37] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#EDEDEF] placeholder:text-[#6B6D75] focus:border-[#3FA66B] outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="bg-[#1A1C23] border border-[#2A2D37] rounded-md px-3 py-1.5 text-xs text-[#EDEDEF] outline-none"
        >
          <option value="">All Sources</option>
          <option value="google_favicon">Favicon</option>
          <option value="generated_monogram">Monogram</option>
          <option value="logo_dev">logo.dev</option>
          <option value="source_scraped">Scraped</option>
          <option value="manual">Manual</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          className="bg-[#1A1C23] border border-[#2A2D37] rounded-md px-3 py-1.5 text-xs text-[#EDEDEF] outline-none"
        >
          <option value="">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <button onClick={fetchLogos} className="p-1.5 bg-[#1A1C23] border border-[#2A2D37] rounded-md text-[#6B6D75] hover:text-[#EDEDEF]">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1A1C23] border border-[#2A2D37] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2A2D37] text-[#6B6D75]">
              <th className="text-left px-4 py-2.5 font-semibold">Logo</th>
              <th className="text-left px-4 py-2.5 font-semibold">Company</th>
              <th className="text-left px-4 py-2.5 font-semibold">Source</th>
              <th className="text-left px-4 py-2.5 font-semibold">Domain</th>
              <th className="text-center px-4 py-2.5 font-semibold">Verified</th>
              <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#6B6D75]">Loading...</td>
              </tr>
            ) : logos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#6B6D75]">No logos found</td>
              </tr>
            ) : (
              logos.map((logo) => {
                const sourceInfo = SOURCE_LABELS[logo.source] || { label: logo.source, color: "text-gray-400" };
                const isMonogram = logo.logoUrl.startsWith("data:");

                return (
                  <tr key={logo.id} className="border-b border-[#2A2D37]/60 hover:bg-[#22242B] transition-colors">
                    <td className="px-4 py-2.5">
                      {isMonogram ? (
                        <div
                          className="w-8 h-8 rounded-md"
                          dangerouslySetInnerHTML={{
                            __html: atob(logo.logoUrl.replace("data:image/svg+xml;base64,", "")),
                          }}
                        />
                      ) : (
                        <img
                          src={logo.logoUrl}
                          alt=""
                          className="w-8 h-8 rounded-md object-contain bg-white p-0.5"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#EDEDEF]">
                      {logo.companyNormalized}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-medium ${sourceInfo.color}`}>{sourceInfo.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#6B6D75]">
                      {logo.resolvedDomain || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => toggleVerified(logo)}
                        className="transition-colors"
                      >
                        {logo.isVerified ? (
                          <CheckCircle2 size={16} className="text-green-400" />
                        ) : (
                          <XCircle size={16} className="text-[#6B6D75] hover:text-yellow-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isMonogram && (
                          <a
                            href={logo.logoUrl}
                            target="_blank"
                            rel="noopener"
                            className="text-[#6B6D75] hover:text-[#EDEDEF]"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => deleteLogo(logo.id)}
                          className="text-[#6B6D75] hover:text-red-400 text-[10px] font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
