import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateConfigCache } from "@/lib/site-config";

/** GET /api/admin/ads — List all ad-related config */
export async function GET() {
  try {
    const rows = await prisma.siteConfig.findMany();
    const config: Record<string, string> = {};
    for (const r of rows) config[r.key] = r.value;
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/admin/ads — Update config values */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entries = Object.entries(body) as [string, string][];

    for (const [key, value] of entries) {
      await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }

    // Invalidate server-side cache
    invalidateConfigCache();

    return NextResponse.json({
      success: true,
      updated: entries.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
