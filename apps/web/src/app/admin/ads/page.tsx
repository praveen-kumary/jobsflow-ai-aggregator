"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  Monitor,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  MessageCircle,
  Send,
  Loader2,
} from "lucide-react";

interface ConfigState {
  ads_enabled: string;
  auto_ads_enabled: string;
  adsense_pub_id: string;
  ad_slot_top: string;
  ad_slot_inline1: string;
  ad_slot_inline2: string;
  ad_slot_sidebar: string;
  ad_slot_sidebar2: string;
  ad_slot_anchor: string;
  telegram_url: string;
  whatsapp_url: string;
  [key: string]: string;
}

const EMPTY_CONFIG: ConfigState = {
  ads_enabled: "false",
  auto_ads_enabled: "false",
  adsense_pub_id: "",
  ad_slot_top: "",
  ad_slot_inline1: "",
  ad_slot_inline2: "",
  ad_slot_sidebar: "",
  ad_slot_sidebar2: "",
  ad_slot_anchor: "",
  telegram_url: "",
  whatsapp_url: "",
};

const AD_SLOTS = [
  { key: "ad_slot_top", label: "Top Banner", desc: "Full-width ad below the header on all pages", icon: "🔝" },
  { key: "ad_slot_inline1", label: "In-Article Ad 1", desc: "Between job header and description", icon: "📰" },
  { key: "ad_slot_inline2", label: "In-Article Ad 2", desc: "Between description and How-to-Apply", icon: "📰" },
  { key: "ad_slot_sidebar", label: "Sidebar Ad", desc: "300×250 in desktop sidebar (below summary table)", icon: "📐" },
  { key: "ad_slot_sidebar2", label: "Sidebar Sticky Ad", desc: "300×250 sticky ad at bottom of sidebar", icon: "📌" },
  { key: "ad_slot_anchor", label: "Mobile Anchor Ad", desc: "Sticky bottom ad on mobile screens", icon: "📱" },
];

export default function AdminAdsPage() {
  const [config, setConfig] = useState<ConfigState>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ads")
      .then((r) => r.json())
      .then((data) => {
        setConfig({ ...EMPTY_CONFIG, ...data });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggle = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const updateField = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#86888F]">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#EDEDEF]">
            Ads & Social Settings
          </h1>
          <p className="text-xs text-[#6B6D75] mt-0.5">
            Configure Google AdSense, ad placements, and social channel URLs.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#3FA66B] text-white text-xs font-bold rounded-md hover:bg-[#359F5F] disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={13} />
          ) : (
            <Save size={13} />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save All"}
        </button>
      </div>

      {/* Success banner */}
      {saved && (
        <div className="bg-[#3FA66B]/10 border border-[#3FA66B]/30 text-[#3FA66B] px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={14} />
          Settings saved. Changes will take effect on the next page load.
        </div>
      )}

      {/* ─── Google AdSense ─── */}
      <section className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#EDEDEF] flex items-center gap-2">
            <Settings size={14} className="text-[#E8873A]" />
            Google AdSense
          </h2>
          <button
            onClick={() => toggle("ads_enabled")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
              config.ads_enabled === "true"
                ? "bg-[#3FA66B]/15 text-[#3FA66B] border border-[#3FA66B]/30"
                : "bg-[#2D3139] text-[#6B6D75] border border-[#2D3139]"
            }`}
          >
            {config.ads_enabled === "true" ? (
              <ToggleRight size={14} />
            ) : (
              <ToggleLeft size={14} />
            )}
            {config.ads_enabled === "true" ? "Ads Enabled" : "Ads Disabled"}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#6B6D75] font-semibold mb-1">
              Publisher ID (ca-pub-XXXXXXX)
            </label>
            <input
              type="text"
              value={config.adsense_pub_id}
              onChange={(e) => updateField("adsense_pub_id", e.target.value)}
              placeholder="ca-pub-1234567890123456"
              className="w-full bg-[#101114] border border-[#2D3139] rounded-md px-3 py-2 text-sm text-[#EDEDEF] placeholder-[#4A4C54] outline-none focus:border-[#E8873A]/50"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#101114] rounded-md border border-[#2D3139]">
            <div>
              <p className="text-xs font-semibold text-[#EDEDEF]">Auto Ads</p>
              <p className="text-[10px] text-[#6B6D75] mt-0.5">
                Let Google automatically place ads (in addition to manual slots)
              </p>
            </div>
            <button
              onClick={() => toggle("auto_ads_enabled")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                config.auto_ads_enabled === "true"
                  ? "bg-[#3FA66B]/15 text-[#3FA66B]"
                  : "bg-[#2D3139] text-[#6B6D75]"
              }`}
            >
              {config.auto_ads_enabled === "true" ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Ad Slot Configuration ─── */}
      <section className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#EDEDEF] flex items-center gap-2">
          <Monitor size={14} className="text-[#3B82F6]" />
          Ad Slot IDs
        </h2>
        <p className="text-[10px] text-[#6B6D75]">
          Enter the slot IDs from your AdSense dashboard. Leave empty to disable a specific slot.
        </p>

        {/* Ad placement diagram */}
        <div className="bg-[#101114] rounded-lg p-4 border border-[#2D3139]">
          <p className="text-[10px] text-[#6B6D75] uppercase tracking-wider font-semibold mb-3">
            Page Layout Preview
          </p>
          <div className="grid grid-cols-[1fr_200px] gap-2 text-[10px]">
            <div className="space-y-1.5">
              <div className="bg-[#2D3139] rounded px-2 py-1.5 text-[#EDEDEF]">📄 Job Header</div>
              <div className={`rounded px-2 py-1.5 border border-dashed ${config.ad_slot_inline1 ? "bg-[#E8873A]/10 border-[#E8873A]/30 text-[#E8873A]" : "bg-[#1A1B1F] border-[#2D3139] text-[#6B6D75]"}`}>
                🔝 In-Article Ad 1
              </div>
              <div className="bg-[#2D3139] rounded px-2 py-1.5 text-[#EDEDEF]">📝 Description</div>
              <div className={`rounded px-2 py-1.5 border border-dashed ${config.ad_slot_inline2 ? "bg-[#E8873A]/10 border-[#E8873A]/30 text-[#E8873A]" : "bg-[#1A1B1F] border-[#2D3139] text-[#6B6D75]"}`}>
                📰 In-Article Ad 2
              </div>
              <div className="bg-[#2D3139] rounded px-2 py-1.5 text-[#EDEDEF]">✅ How to Apply</div>
              <div className="bg-[#2D3139] rounded px-2 py-1.5 text-[#EDEDEF]">❓ FAQs</div>
            </div>
            <div className="space-y-1.5">
              <div className="bg-[#2D3139] rounded px-2 py-1.5 text-[#EDEDEF]">📋 Summary</div>
              <div className={`rounded px-2 py-1.5 border border-dashed ${config.ad_slot_sidebar ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]" : "bg-[#1A1B1F] border-[#2D3139] text-[#6B6D75]"}`}>
                📐 Sidebar Ad
              </div>
              <div className="bg-[#2D3139] rounded px-2 py-1.5 text-[#EDEDEF]">📰 Latest Jobs</div>
              <div className={`rounded px-2 py-1.5 border border-dashed ${config.ad_slot_sidebar2 ? "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]" : "bg-[#1A1B1F] border-[#2D3139] text-[#6B6D75]"}`}>
                📌 Sticky Ad
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AD_SLOTS.map((slot) => (
            <div key={slot.key} className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider text-[#6B6D75] font-semibold">
                {slot.icon} {slot.label}
              </label>
              <input
                type="text"
                value={config[slot.key] || ""}
                onChange={(e) => updateField(slot.key, e.target.value)}
                placeholder="Slot ID (e.g. 1234567890)"
                className="w-full bg-[#101114] border border-[#2D3139] rounded-md px-3 py-2 text-xs text-[#EDEDEF] placeholder-[#4A4C54] outline-none focus:border-[#3B82F6]/50 font-mono"
              />
              <p className="text-[9px] text-[#6B6D75]">{slot.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Social Channel URLs ─── */}
      <section className="bg-[#1A1B1F] border border-[#2D3139] rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#EDEDEF] flex items-center gap-2">
          <MessageCircle size={14} className="text-[#25D366]" />
          Social Channel URLs
        </h2>
        <p className="text-[10px] text-[#6B6D75]">
          These URLs appear in the social CTA bar on every public page.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-wider text-[#6B6D75] font-semibold">
              WhatsApp Channel URL
            </label>
            <input
              type="url"
              value={config.whatsapp_url}
              onChange={(e) => updateField("whatsapp_url", e.target.value)}
              placeholder="https://whatsapp.com/channel/..."
              className="w-full bg-[#101114] border border-[#2D3139] rounded-md px-3 py-2 text-xs text-[#EDEDEF] placeholder-[#4A4C54] outline-none focus:border-[#25D366]/50"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-wider text-[#6B6D75] font-semibold">
              Telegram Group URL
            </label>
            <input
              type="url"
              value={config.telegram_url}
              onChange={(e) => updateField("telegram_url", e.target.value)}
              placeholder="https://t.me/..."
              className="w-full bg-[#101114] border border-[#2D3139] rounded-md px-3 py-2 text-xs text-[#EDEDEF] placeholder-[#4A4C54] outline-none focus:border-[#0088cc]/50"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
