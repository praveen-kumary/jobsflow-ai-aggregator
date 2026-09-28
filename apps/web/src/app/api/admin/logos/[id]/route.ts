import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const update: any = {};
  if (body.logoUrl !== undefined) update.logoUrl = body.logoUrl;
  if (body.isVerified !== undefined) update.isVerified = body.isVerified;
  if (body.source !== undefined) update.source = body.source;

  // If manually updating the logo URL, mark source as "manual"
  if (body.logoUrl && !body.source) {
    update.source = "manual";
  }

  const logo = await prisma.companyLogo.update({
    where: { id },
    data: update,
  });

  return NextResponse.json(logo);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.companyLogo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
