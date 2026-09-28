"use client";

import { useEffect, useRef, useState } from "react";

interface AdSlotProps {
  /** Google AdSense ad slot ID */
  slotId: string;
  /** AdSense publisher ID (ca-pub-xxx) */
  pubId: string;
  /** Ad format: display, in-article, fluid, auto */
  format?: "display" | "in-article" | "fluid" | "auto";
  /** Responsive sizing */
  responsive?: boolean;
  /** Custom class */
  className?: string;
  /** Min height to prevent layout shift */
  minHeight?: number;
}

/**
 * Google AdSense ad slot component.
 * Renders an <ins> tag that AdSense fills with an ad.
 * Collapses to zero height if no ad is served (no blank space).
 */
export function AdSlot({
  slotId,
  pubId,
  format = "auto",
  responsive = true,
  className = "",
  minHeight = 90,
}: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!slotId || !pubId || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }

    // Monitor if the ad actually fills — collapse if it doesn't after 3s
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const ins = containerRef.current.querySelector("ins.adsbygoogle");
        if (ins) {
          const status = ins.getAttribute("data-ad-status");
          const height = (ins as HTMLElement).offsetHeight;
          // AdSense sets data-ad-status="unfilled" when no ad is served
          if (status === "unfilled" || height < 10) {
            setCollapsed(true);
          }
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [slotId, pubId]);

  if (!slotId || !pubId) return null;
  if (collapsed) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-container ${className}`}
      style={{ minHeight: `${minHeight}px`, textAlign: "center" as const }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          ...(format === "in-article" ? {} : { width: "100%" }),
        }}
        data-ad-client={pubId}
        data-ad-slot={slotId}
        data-ad-format={format === "display" ? "rectangle" : format}
        {...(responsive ? { "data-full-width-responsive": "true" } : {})}
      />
    </div>
  );
}

/**
 * Ad placeholder — visible in dev mode ONLY.
 * In production: renders NOTHING (zero height, no blank space).
 * This matches the competitor's behavior where unfilled ad slots
 * simply don't exist in the DOM.
 */
export function AdPlaceholder({
  label = "Ad Space",
  className = "",
  minHeight = 90,
}: {
  label?: string;
  className?: string;
  minHeight?: number;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // SSR: render nothing
  if (!isClient) return null;

  const isDev = window.location.hostname === "localhost";

  // Production: render NOTHING — no blank space, no reserved height
  if (!isDev) return null;

  // Dev only: show a subtle placeholder for layout debugging
  return (
    <div
      className={`flex items-center justify-center border border-dashed border-[#d0d5dd]/40 bg-[#f7f8fa]/50 rounded text-[10px] text-[#ccc] font-medium ${className}`}
      style={{ minHeight: `${minHeight}px` }}
    >
      {label}
    </div>
  );
}
