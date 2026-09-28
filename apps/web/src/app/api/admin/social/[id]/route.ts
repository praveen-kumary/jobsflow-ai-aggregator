import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const update: any = {};
  if (body.caption !== undefined) update.caption = body.caption;
  if (body.template !== undefined) update.template = body.template;
  if (body.status !== undefined) update.status = body.status;

  const post = await prisma.socialPost.update({
    where: { id },
    data: update,
  });

  return NextResponse.json(post);
}
