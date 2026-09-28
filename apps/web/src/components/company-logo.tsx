"use client";

import React, { useState, useEffect, useMemo } from "react";

// Inline monogram for immediate fallback rendering (no API call needed)
const MONOGRAM_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#EA580C", "#CA8A04",
  "#16A34A", "#0D9488", "#0891B2", "#4F46E5", "#9333EA", "#C026D3",
  "#059669", "#0284C7", "#1D4ED8", "#6D28D9",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(name: string) {
  const w = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(x => x);
  if (!w.length) return "?";
  return w.length === 1 ? w[0].substring(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
}

interface CompanyLogoProps {
  company: string;
  companyNormalized?: string;
  size?: number;
  className?: string;
}

/**
 * Renders a company logo with built-in monogram fallback.
 * - Shows a monogram instantly (no loading state)
 * - Fetches the real logo from /api/logo/[company] in the background
 * - If the resolved logo is also a monogram, skips the fetch image step
 * - Handles image load errors gracefully (falls back to monogram)
 */
export function CompanyLogo({ company, companyNormalized, size = 32, className = "" }: CompanyLogoProps) {
  const normalized = useMemo(
    () => companyNormalized || company.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(),
    [company, companyNormalized]
  );

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Monogram fallback — always available instantly
  const mono = useMemo(() => {
    const bgColor = MONOGRAM_COLORS[hashStr(normalized) % MONOGRAM_COLORS.length];
    const init = initials(company);
    return { bgColor, initials: init };
  }, [normalized, company]);

  // Fetch real logo in background
  useEffect(() => {
    let cancelled = false;

    const fetchLogo = async () => {
      try {
        const res = await fetch(`/api/logo/${encodeURIComponent(normalized)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.logoUrl && data.source !== "generated_monogram") {
          setLogoUrl(data.logoUrl);
        }
      } catch {
        // Keep monogram
      }
    };

    fetchLogo();
    return () => { cancelled = true; };
  }, [normalized]);

  const borderRadius = size * 0.2;
  const fontSize = mono.initials.length === 1 ? size * 0.45 : size * 0.35;

  // Show resolved logo image
  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={`${company} logo`}
        width={size}
        height={size}
        className={`flex-shrink-0 object-contain ${className}`}
        style={{ borderRadius, width: size, height: size }}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  // Monogram fallback — renders instantly, looks intentional
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: mono.bgColor,
      }}
      title={company}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color: "white",
          lineHeight: 1,
          letterSpacing: 1,
        }}
      >
        {mono.initials}
      </span>
    </div>
  );
}
