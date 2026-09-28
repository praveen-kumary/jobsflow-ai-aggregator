import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: { applyUrl: true },
    });

    if (!job) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Increment click count asynchronously
    await prisma.job.update({
      where: { id },
      data: {
        applyClickCount: { increment: 1 },
      },
    });

    return NextResponse.redirect(job.applyUrl);
  } catch (error) {
    console.error("Error in apply tracking redirect:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
