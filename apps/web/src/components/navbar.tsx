"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Calendar,
  GraduationCap,
  MapPin,
  Briefcase,
  Menu,
  X,
  Bell,
} from "lucide-react";

export function PublicNavbar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const batches = [
    { label: "2027 Batch", query: "2027" },
    { label: "2026 Batch", query: "2026" },
    { label: "2025 Batch", query: "2025" },
    { label: "2024 Batch", query: "2024" },
  ];

  const degrees = [
    { label: "B.E / B.Tech", query: "B.E/B.Tech" },
    { label: "BCA / MCA", query: "BCA/MCA" },
    { label: "B.Sc / M.Sc", query: "B.Sc/M.Sc" },
    { label: "M.E / M.Tech", query: "M.E/M.Tech/M.S" },
    { label: "Any Graduate", query: "Any Degree" },
  ];

  const cities = [
    { label: "Bangalore", query: "Bangalore" },
    { label: "Hyderabad", query: "Hyderabad" },
    { label: "Pune", query: "Pune" },
    { label: "Delhi NCR", query: "Gurgaon" },
    { label: "Mumbai", query: "Mumbai" },
    { label: "Chennai", query: "Chennai" },
    { label: "Remote", query: "Remote" },
  ];

  const toggle = (menu: string) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  function DropdownMenu({
    id,
    icon,
    label,
    items,
    paramKey,
  }: {
    id: string;
    icon: React.ReactNode;
    label: string;
    items: { label: string; query: string }[];
    paramKey: string;
  }) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle(id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
            openMenu === id
              ? "bg-[#1E293B] text-white"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          {icon}
          <span>{label}</span>
          <ChevronDown
            size={12}
            className={`transition-transform ${openMenu === id ? "rotate-180" : ""}`}
          />
        </button>

        {openMenu === id && (
          <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#0F1729] border border-[#1E293B] rounded-lg shadow-xl py-1 z-50">
            {items.map((item) => (
              <Link
                key={item.query}
                href={`/?${paramKey}=${encodeURIComponent(item.query)}`}
                onClick={() => setOpenMenu(null)}
                className="block px-3.5 py-2 text-[13px] text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 bg-[#0F1729] border-b border-[#1E293B]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-[17px] tracking-tight text-white">
              FRESHER<span className="text-[#E8873A]">PORTAL</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            <DropdownMenu
              id="batches"
              icon={<Calendar size={13} className="text-[#64748B]" />}
              label="Batches"
              items={batches}
              paramKey="batch"
            />
            <DropdownMenu
              id="degrees"
              icon={<GraduationCap size={13} className="text-[#64748B]" />}
              label="Degrees"
              items={degrees}
              paramKey="degree"
            />
            <DropdownMenu
              id="cities"
              icon={<MapPin size={13} className="text-[#64748B]" />}
              label="Cities"
              items={cities}
              paramKey="city"
            />
            <Link
              href="/?jobType=internship"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-[#94A3B8] hover:text-white rounded-md transition-colors"
            >
              <Briefcase size={13} className="text-[#64748B]" />
              <span>Internships</span>
            </Link>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="https://whatsapp.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1F7A5C] hover:bg-[#196B4F] text-white text-[13px] font-semibold transition-colors"
          >
            <Bell size={13} />
            <span>Alerts</span>
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#1E293B]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0F1729] border-t border-[#1E293B] px-4 py-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-2 pb-1">
            Batch Year
          </p>
          {batches.map((b) => (
            <Link
              key={b.query}
              href={`/?batch=${b.query}`}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] rounded-md"
            >
              {b.label}
            </Link>
          ))}

          <div className="border-t border-[#1E293B] my-2" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-2 pb-1">
            City
          </p>
          {cities.map((c) => (
            <Link
              key={c.query}
              href={`/?city=${encodeURIComponent(c.query)}`}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] rounded-md"
            >
              {c.label}
            </Link>
          ))}

          <div className="border-t border-[#1E293B] my-2" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-2 pb-1">
            Degree
          </p>
          {degrees.map((d) => (
            <Link
              key={d.query}
              href={`/?degree=${encodeURIComponent(d.query)}`}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] rounded-md"
            >
              {d.label}
            </Link>
          ))}

          <div className="border-t border-[#1E293B] my-2" />
          <a
            href="https://whatsapp.com"
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center py-2.5 rounded-md bg-[#1F7A5C] text-white text-sm font-semibold"
          >
            Join WhatsApp Alerts
          </a>
        </div>
      )}
    </header>
  );
}
