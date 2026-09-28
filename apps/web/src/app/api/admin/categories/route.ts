import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [canonicalValues, aliases, sources] = await Promise.all([
      prisma.canonicalValue.findMany({ orderBy: [{ type: "asc" }, { value: "asc" }] }),
      prisma.categoryAlias.findMany({
        orderBy: [{ sourceId: "asc" }, { canonicalType: "asc" }],
        include: { source: { select: { name: true } } },
      }),
      prisma.source.findMany({ select: { id: true, name: true } }),
    ]);

    return NextResponse.json({ success: true, canonicalValues, aliases, sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_canonical") {
      const { type, value } = body;
      const created = await prisma.canonicalValue.upsert({
        where: { type_value: { type, value } },
        update: { isActive: true },
        create: { type, value, isActive: true },
      });
      return NextResponse.json({ success: true, item: created });
    }

    if (action === "create_alias") {
      const { sourceId, rawValue, canonicalType, canonicalValue } = body;
      const created = await prisma.categoryAlias.upsert({
        where: {
          sourceId_rawValue_canonicalType: {
            sourceId,
            rawValue,
            canonicalType,
          },
        },
        update: { canonicalValue },
        create: {
          sourceId,
          rawValue,
          canonicalType,
          canonicalValue,
          confidence: 1.0,
          createdBy: "manual",
        },
      });
      return NextResponse.json({ success: true, item: created });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (type === "canonical" && id) {
      await prisma.canonicalValue.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (type === "alias" && id) {
      await prisma.categoryAlias.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
