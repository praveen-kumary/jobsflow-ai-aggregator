"use client";

import { useEffect, useState } from "react";

interface StickyApplyBarProps {
  company: string;
  applyUrl: string;
}

/**
 * Fixed bottom bar on mobile showing company name + Apply button.
 * Only visible after user scrolls past the first Apply CTA (300px).
 */
export function StickyApplyBar({ company, applyUrl }: StickyApplyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E4E1D9] px-4 py-2.5 flex items-center justify-between safe-bottom shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="min-w-0 mr-3">
        <p className="text-xs font-bold text-[#0F1729] truncate">{company}</p>
        <p className="text-[10px] text-[#94A3B8]">Verified Opening</p>
      </div>
      <a
        href={applyUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 px-5 py-2.5 rounded-lg bg-[#E8873A] text-white font-bold text-sm hover:bg-[#D4762A] transition-colors shadow-sm"
      >
        Apply Now ↗
      </a>
    </div>
  );
}
