import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { EditorShell } from "@/components/editor/EditorShell";
import { getProjectRecordForUser } from "@/lib/projects";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getPageSession();
  if (!session?.user?.id) redirect("/");

  const { projectId } = await params;
  const project = await getProjectRecordForUser(session.user.id, projectId);
  if (!project) notFound();
  if (project.kind === "product") redirect(`/builder/${project.id}` as Route);

  return <EditorShell projectId={project.id} />;
}
