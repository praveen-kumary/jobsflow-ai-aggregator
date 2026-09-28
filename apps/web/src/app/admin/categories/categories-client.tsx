"use client";

import { useState } from "react";
import { Plus, Trash2, Tag, Layers, Check } from "lucide-react";

interface CanonicalItem {
  id: string;
  type: string;
  value: string;
  isActive: boolean;
}

interface AliasItem {
  id: string;
  sourceId: string;
  rawValue: string;
  canonicalType: string;
  canonicalValue: string;
  confidence: number;
  source: { name: string };
}

export function CategoriesClient({
  initialCanonical,
  initialAliases,
  sources,
}: {
  initialCanonical: CanonicalItem[];
  initialAliases: AliasItem[];
  sources: { id: string; name: string }[];
}) {
  const [activeTab, setActiveTab] = useState<"canonical" | "aliases">("canonical");
  const [canonical, setCanonical] = useState(initialCanonical);
  const [aliases, setAliases] = useState(initialAliases);

  // New Canonical input
  const [newType, setNewType] = useState("batchYear");
  const [newValue, setNewValue] = useState("");

  // New Alias input
  const [aliasSourceId, setAliasSourceId] = useState(sources[0]?.id || "");
  const [aliasRaw, setAliasRaw] = useState("");
  const [aliasType, setAliasType] = useState("batchYear");
  const [aliasCanonical, setAliasCanonical] = useState("");

  const [loading, setLoading] = useState(false);

  async function addCanonical(e: React.FormEvent) {
    e.preventDefault();
    if (!newValue.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_canonical",
          type: newType,
          value: newValue.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCanonical((prev) => [...prev, data.item]);
        setNewValue("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCanonical(id: string) {
    try {
      const res = await fetch(`/api/admin/categories?type=canonical&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCanonical((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function addAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasRaw.trim() || !aliasCanonical.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_alias",
          sourceId: aliasSourceId,
          rawValue: aliasRaw.trim(),
          canonicalType: aliasType,
          canonicalValue: aliasCanonical.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const src = sources.find((s) => s.id === aliasSourceId);
        setAliases((prev) => [
          ...prev,
          { ...data.item, source: { name: src?.name || "Source" } },
        ]);
        setAliasRaw("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAlias(id: string) {
    try {
      const res = await fetch(`/api/admin/categories?type=alias&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAliases((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Group canonical by type
  const types = ["batchYear", "degree", "city", "jobType", "functionalArea"];

  return (
    <div className="space-y-6">
      {/* Tabs Switcher */}
      <div className="flex items-center space-x-2 border-b border-[#2D3139] pb-3">
        <button
          onClick={() => setActiveTab("canonical")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === "canonical"
              ? "bg-[#3FA66B] text-white"
              : "text-[#86888F] hover:text-white hover:bg-[#20222A]"
          }`}
        >
          <Layers size={14} />
          <span>Canonical Taxonomy Values</span>
        </button>

        <button
          onClick={() => setActiveTab("aliases")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === "aliases"
              ? "bg-[#3FA66B] text-white"
              : "text-[#86888F] hover:text-white hover:bg-[#20222A]"
          }`}
        >
          <Tag size={14} />
          <span>Tier-1 Category Aliases (Per Source)</span>
        </button>
      </div>

      {activeTab === "canonical" ? (
        <div className="space-y-6">
          {/* Add Form */}
          <form
            onSubmit={addCanonical}
            className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-4 flex flex-wrap items-center gap-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#86888F]">
              Add Canonical Value:
            </span>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3FA66B]"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="e.g. 2028 or Chandigarh"
              className="bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#86888F] focus:outline-none focus:border-[#3FA66B]"
            />
            <button
              type="submit"
              disabled={loading || !newValue.trim()}
              className="px-3.5 py-1.5 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={13} />
              <span>Add Value</span>
            </button>
          </form>

          {/* Grouped lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {types.map((t) => {
              const items = canonical.filter((c) => c.type === t);
              return (
                <div
                  key={t}
                  className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#262830] pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#3FA66B]">
                      {t}
                    </h3>
                    <span className="text-[11px] text-[#86888F]">{items.length} values</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252830] border border-[#343844] text-xs text-[#EDEDEF]"
                      >
                        <span>{item.value}</span>
                        <button
                          type="button"
                          onClick={() => deleteCanonical(item.id)}
                          className="text-[#86888F] hover:text-[#D6553D] transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Alias Form */}
          <form
            onSubmit={addAlias}
            className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl p-4 flex flex-wrap items-center gap-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#86888F]">
              Map New Alias:
            </span>
            <select
              value={aliasSourceId}
              onChange={(e) => setAliasSourceId(e.target.value)}
              className="bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3FA66B]"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={aliasRaw}
              onChange={(e) => setAliasRaw(e.target.value)}
              placeholder="Raw Scraped Tag (e.g. BE/BTECH)"
              className="bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#86888F] focus:outline-none focus:border-[#3FA66B]"
            />
            <select
              value={aliasType}
              onChange={(e) => setAliasType(e.target.value)}
              className="bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3FA66B]"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={aliasCanonical}
              onChange={(e) => setAliasCanonical(e.target.value)}
              placeholder="Canonical Value (e.g. B.E/B.Tech)"
              className="bg-[#121316] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#86888F] focus:outline-none focus:border-[#3FA66B]"
            />
            <button
              type="submit"
              disabled={loading || !aliasRaw.trim() || !aliasCanonical.trim()}
              className="px-3.5 py-1.5 bg-[#3FA66B] hover:bg-[#348a58] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={13} />
              <span>Map Alias</span>
            </button>
          </form>

          {/* Aliases Table */}
          <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2D3139] bg-[#141518] text-[11px] font-bold uppercase tracking-wider text-[#86888F]">
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Raw Scraped Tag</th>
                  <th className="py-3 px-4">Canonical Type</th>
                  <th className="py-3 px-4">Canonical Value</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262830]">
                {aliases.map((a) => (
                  <tr key={a.id} className="hover:bg-[#20222A] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-white">
                      {a.source?.name || a.sourceId}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#C9A227]">
                      {a.rawValue}
                    </td>
                    <td className="py-2.5 px-4 text-[#86888F]">
                      <span className="px-2 py-0.5 rounded bg-[#252830] border border-[#343844] text-[11px]">
                        {a.canonicalType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#3FA66B]">
                      {a.canonicalValue}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => deleteAlias(a.id)}
                        className="text-[#86888F] hover:text-[#D6553D] p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
