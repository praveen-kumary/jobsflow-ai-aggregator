import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Inline monogram generator for the web app (no worker dependency needed)
const MONOGRAM_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#EA580C", "#CA8A04",
  "#16A34A", "#0D9488", "#0891B2", "#4F46E5", "#9333EA", "#C026D3",
  "#059669", "#0284C7", "#1D4ED8", "#6D28D9",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function makeMonogramSvg(companyNormalized: string, size = 128): string {
  const initials = getInitials(companyNormalized);
  const bg = MONOGRAM_COLORS[hashString(companyNormalized) % MONOGRAM_COLORS.length];
  const fontSize = initials.length === 1 ? size * 0.5 : size * 0.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="700" font-size="${fontSize}" fill="white" letter-spacing="1">${initials}</text></svg>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ company: string }> }
) {
  const { company } = await params;
  const companyNormalized = decodeURIComponent(company).toLowerCase().trim();

  if (!companyNormalized) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 });
  }

  // Check cache
  const logo = await prisma.companyLogo.findUnique({
    where: { companyNormalized },
  });

  if (logo) {
    return NextResponse.json({
      logoUrl: logo.logoUrl,
      source: logo.source,
      isVerified: logo.isVerified,
    }, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  }

  // No cached logo — return a monogram immediately (don't block on external APIs)
  const monogramSvg = makeMonogramSvg(companyNormalized);
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(monogramSvg).toString("base64")}`;

  // Upsert the monogram as a placeholder (the worker's resolver will upgrade it later if possible)
  try {
    await prisma.companyLogo.create({
      data: {
        companyNormalized,
        logoUrl: dataUri,
        source: "generated_monogram",
      },
    });
  } catch {
    // Ignore race condition (already created by another request)
  }

  return NextResponse.json({
    logoUrl: dataUri,
    source: "generated_monogram",
    isVerified: false,
  }, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
