import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCompanyName, normalizeRoleTitle } from "@repo/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: { rawJob: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = { ...body };

    // If company or role are being changed, re-normalize
    if (body.company) {
      updateData.companyNormalized = normalizeCompanyName(body.company);
    }
    if (body.role) {
      updateData.roleNormalized = normalizeRoleTitle(body.role);
    }
    if (body.deadline) {
      updateData.deadline = new Date(body.deadline);
    }

    const updated = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (error: any) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
