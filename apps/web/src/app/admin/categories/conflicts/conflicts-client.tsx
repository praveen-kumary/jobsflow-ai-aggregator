"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";

interface ConflictItem {
  id: string;
  jobId: string;
  canonicalType: string;
  aliasValue: string;
  llmValue: string;
  createdAt: Date | string;
}

export function ConflictsClient({ initialConflicts }: { initialConflicts: ConflictItem[] }) {
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolve(id: string, value: string, updateAlias: boolean) {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/admin/conflicts/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedValue: value, updateAlias }),
      });

      if (res.ok) {
        setConflicts((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Error resolving conflict:", err);
    } finally {
      setResolvingId(null);
    }
  }

  if (conflicts.length === 0) {
    return (
      <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg p-12 text-center text-[#86888F]">
        <Check className="mx-auto h-8 w-8 text-[#3FA66B] mb-2" />
        <p className="text-base font-medium text-white">No Category Conflicts</p>
        <p className="text-xs mt-1">Tier-1 alias table and LLM extractions are in agreement.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#2D3139] bg-[#141518] text-xs font-semibold uppercase tracking-wider text-[#86888F]">
            <th className="py-3 px-4">Field</th>
            <th className="py-3 px-4">Tier-1 Alias Value</th>
            <th className="py-3 px-4">LLM Extracted Value</th>
            <th className="py-3 px-4 text-right">Resolve Disagreement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2D3139]">
          {conflicts.map((c) => (
            <tr key={c.id} className="hover:bg-[#21232B] transition-colors">
              <td className="py-3 px-4 font-mono text-xs text-[#EDEDEF]">
                <span className="px-2 py-0.5 bg-[#2A2B30] rounded border border-[#383B44]">
                  {c.canonicalType}
                </span>
              </td>
              <td className="py-3 px-4 text-xs font-medium text-[#C9A227]">
                {c.aliasValue}
              </td>
              <td className="py-3 px-4 text-xs font-medium text-[#3FA66B]">
                {c.llmValue}
              </td>
              <td className="py-3 px-4 text-right space-x-2">
                <button
                  onClick={() => handleResolve(c.id, c.aliasValue, false)}
                  disabled={resolvingId === c.id}
                  className="px-2.5 py-1 text-xs font-medium bg-[#2B2D33] hover:bg-[#383A42] text-white rounded transition-colors disabled:opacity-50"
                >
                  Use Alias: "{c.aliasValue}"
                </button>
                <button
                  onClick={() => handleResolve(c.id, c.llmValue, true)}
                  disabled={resolvingId === c.id}
                  className="px-2.5 py-1 text-xs font-medium bg-[#3FA66B] hover:bg-[#348a58] text-white rounded transition-colors disabled:opacity-50"
                >
                  Use LLM & Update Alias: "{c.llmValue}"
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
