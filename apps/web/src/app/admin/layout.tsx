"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Globe,
  CopyCheck,
  Tag,
  AlertCircle,
  ExternalLink,
  Menu,
  X,
  ImageIcon,
  Share2,
  Megaphone,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/queue", label: "Review Queue", icon: Inbox },
  { href: "/admin/jobs", label: "All Jobs", icon: Briefcase },
  { href: "/admin/sources", label: "Sources", icon: Globe },
  { href: "/admin/duplicates", label: "Duplicates", icon: CopyCheck },
  { href: "/admin/categories", label: "Taxonomy", icon: Tag, dividerBefore: true },
  { href: "/admin/categories/conflicts", label: "Conflicts", icon: AlertCircle },
  { href: "/admin/logos", label: "Company Logos", icon: ImageIcon, dividerBefore: true },
  { href: "/admin/social", label: "Social Queue", icon: Share2 },
  { href: "/admin/ads", label: "Ads & Settings", icon: Megaphone },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: any;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
        isActive
          ? "bg-[#2A2D37] text-white"
          : "text-[#6B6D75] hover:text-[#EDEDEF] hover:bg-[#1E2028]"
      }`}
    >
      <Icon size={14} className={isActive ? "text-[#3FA66B]" : ""} />
      <span>{label}</span>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen bg-[#101114] text-[#EDEDEF] flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-[#1E2028] bg-[#141518] sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#3FA66B]" />
              <span className="font-bold text-[13px] tracking-wide uppercase text-white">
                Control Center
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => (
                <span key={item.href} className="flex items-center">
                  {item.dividerBefore && (
                    <span className="h-4 w-px bg-[#2D3139] mx-1.5" />
                  )}
                  <NavLink
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive(item.href, item.exact)}
                  />
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1 text-xs text-[#6B6D75] hover:text-white bg-[#1E2028] px-2.5 py-1 rounded-md border border-[#2D3139] transition-colors"
            >
              <span>Public Site</span>
              <ExternalLink size={11} />
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-md text-[#6B6D75] hover:text-white hover:bg-[#1E2028]"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[#1E2028] bg-[#141518] px-4 py-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive(item.href, item.exact)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
            <div className="border-t border-[#1E2028] mt-2 pt-2">
              <Link
                href="/"
                target="_blank"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B6D75] hover:text-white"
              >
                <ExternalLink size={13} />
                <span>View Public Site</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
