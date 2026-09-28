import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { JobEditorClient } from "./job-editor-client";

export const dynamic = "force-dynamic";

export default async function AdminJobEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
  });

  if (!job) notFound();

  return <JobEditorClient job={job} />;
}
