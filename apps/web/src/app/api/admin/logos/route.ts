import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const verified = searchParams.get("verified");
  const search = searchParams.get("search");

  const where: any = {};
  if (source) where.source = source;
  if (verified === "true") where.isVerified = true;
  if (verified === "false") where.isVerified = false;
  if (search) where.companyNormalized = { contains: search.toLowerCase() };

  const logos = await prisma.companyLogo.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logos);
}
