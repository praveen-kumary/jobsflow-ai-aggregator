import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");

  const where: any = {};
  if (platform) where.platform = platform;
  if (status) where.status = status;

  const posts = await prisma.socialPost.findMany({
    where,
    include: {
      job: {
        select: { company: true, role: true, slug: true, companyNormalized: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(posts);
}
